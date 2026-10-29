import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30days"; // "today", "yesterday", "7days", "30days", "thisMonth", "custom"
    const cityCode = searchParams.get("city") || "ALL"; // "ALL", "TBS", "BUS", "KUT"
    const tripType = searchParams.get("tripType") || "ALL"; // "ALL", "LOCAL", "ONE_WAY"
    const customStart = searchParams.get("startDate");
    const customEnd = searchParams.get("endDate");

    const now = new Date();
    const GEL_USD_RATE = 2.70; // 1 USD = 2.70 GEL

    // Determine Date Range
    let startDate = new Date();
    let endDate = new Date();

    if (period === "today") {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === "yesterday") {
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === "7days") {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === "30days") {
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === "thisMonth") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === "custom" && customStart && customEnd) {
      startDate = new Date(customStart);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    const periodDays = Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Filter Bookings
    const bookingWhere: any = {
      startDate: { gte: startDate, lte: endDate },
      status: { notIn: ["CANCELLED"] },
    };

    if (cityCode !== "ALL") {
      bookingWhere.pickupLocation = {
        city: { code: cityCode },
      };
    }

    // Query Bookings
    const bookings = await prisma.booking.findMany({
      where: bookingWhere,
      include: {
        car: {
          include: { city: true },
        },
        customer: true,
        pickupLocation: {
          include: { city: true },
        },
        returnLocation: {
          include: { city: true },
        },
        payments: true,
        handoverReport: true,
        extras: true,
      },
      orderBy: { startDate: "desc" },
    });

    // Query All Cars (fleet)
    const carWhere: any = {};
    if (cityCode !== "ALL") {
      carWhere.city = { code: cityCode };
    }
    const fleetCars = await prisma.car.findMany({
      where: carWhere,
      include: {
        city: true,
        bookings: {
          where: {
            status: { notIn: ["CANCELLED"] },
          },
          include: {
            pickupLocation: { include: { city: true } },
            returnLocation: { include: { city: true } },
          },
        },
      },
    });

    // Query Expenses for Period
    const expenseWhere: any = {
      date: { gte: startDate, lte: endDate },
    };
    if (cityCode !== "ALL") {
      expenseWhere.city = { code: cityCode };
    }
    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      include: {
        account: true,
        city: true,
        car: true,
      },
      orderBy: { date: "desc" },
    });

    // Filter bookings by tripType if specified
    const filteredBookings = bookings.filter((b) => {
      const isOneWay = b.pickupLocation?.city?.code !== b.returnLocation?.city?.code;
      if (tripType === "LOCAL") return !isOneWay;
      if (tripType === "ONE_WAY") return isOneWay;
      return true;
    });

    // 1. REVENUE CALCULATIONS
    let grossRevenueUSD = 0;
    let rentalRevenueUSD = 0;
    let oneWayRevenueUSD = 0;
    let extrasRevenueUSD = 0;
    let totalPaidDays = 0;
    let oneWayCount = 0;
    let localCount = 0;

    filteredBookings.forEach((b) => {
      grossRevenueUSD += b.totalAmount;
      rentalRevenueUSD += b.rentalTotal;
      oneWayRevenueUSD += b.deliveryFee || 0;
      extrasRevenueUSD += b.extrasTotal || 0;
      totalPaidDays += b.rentalDays;

      const isOneWay = b.pickupLocation?.city?.code !== b.returnLocation?.city?.code;
      if (isOneWay) {
        oneWayCount++;
      } else {
        localCount++;
      }
    });

    // 2. EXPENSES CALCULATIONS
    let totalExpensesGEL = 0;
    const expensesByCategory: Record<string, { label: string; amountGEL: number; amountUSD: number; count: number }> = {
      WASHING: { label: "Мойка и детейлинг", amountGEL: 0, amountUSD: 0, count: 0 },
      FUEL: { label: "Топливо и перегоны", amountGEL: 0, amountUSD: 0, count: 0 },
      MAINTENANCE: { label: "ТО, запчасти и шиномонтаж", amountGEL: 0, amountUSD: 0, count: 0 },
      OWNER_PAYOUT: { label: "Выплаты инвесторам (владельцам авто)", amountGEL: 0, amountUSD: 0, count: 0 },
      SALARY: { label: "Зарплаты и бонусы менеджеров", amountGEL: 0, amountUSD: 0, count: 0 },
      OFFICE_RENT: { label: "Аренда офисов и стоянок", amountGEL: 0, amountUSD: 0, count: 0 },
      PARKING_FINES: { label: "Парковки в аэропортах и штрафы", amountGEL: 0, amountUSD: 0, count: 0 },
      MARKETING: { label: "Реклама и маркетинг", amountGEL: 0, amountUSD: 0, count: 0 },
      OTHER: { label: "Прочие расходы", amountGEL: 0, amountUSD: 0, count: 0 },
    };

    expenses.forEach((e) => {
      totalExpensesGEL += e.amount;
      const cat = expensesByCategory[e.category] ? e.category : "OTHER";
      expensesByCategory[cat].amountGEL += e.amount;
      expensesByCategory[cat].amountUSD += Math.round(e.amount / GEL_USD_RATE);
      expensesByCategory[cat].count += 1;
    });

    const totalExpensesUSD = Math.round(totalExpensesGEL / GEL_USD_RATE);

    // Direct variable operational costs (Fuel + Wash + ТО)
    const directCostsUSD =
      expensesByCategory.WASHING.amountUSD +
      expensesByCategory.FUEL.amountUSD +
      expensesByCategory.MAINTENANCE.amountUSD;

    const grossProfitUSD = Math.max(0, grossRevenueUSD - directCostsUSD);
    const netOperatingProfitUSD = grossRevenueUSD - totalExpensesUSD;
    const operatingMargin = grossRevenueUSD > 0 ? (netOperatingProfitUSD / grossRevenueUSD) * 100 : 0;

    // 3. OPERATIONAL & FLEET METRICS
    const totalFleetCount = fleetCars.length;
    const availableVehicleDays = totalFleetCount * periodDays;
    const fleetUtilizationRate =
      availableVehicleDays > 0 ? Math.min(100, (totalPaidDays / availableVehicleDays) * 100) : 0;

    const revPAC = totalFleetCount > 0 ? Math.round(grossRevenueUSD / totalFleetCount) : 0;
    const adrUSD = totalPaidDays > 0 ? Math.round(rentalRevenueUSD / totalPaidDays) : 0;
    const aovUSD = filteredBookings.length > 0 ? Math.round(grossRevenueUSD / filteredBookings.length) : 0;
    const alosDays = filteredBookings.length > 0 ? Number((totalPaidDays / filteredBookings.length).toFixed(1)) : 0;
    const oneWayShare =
      filteredBookings.length > 0 ? Number(((oneWayCount / filteredBookings.length) * 100).toFixed(1)) : 0;

    // 4. UNIT ECONOMICS PER CAR
    const unitEconomics = fleetCars.map((car) => {
      // Find all bookings for this car within the period
      const carBookings = bookings.filter((b) => b.carId === car.id);
      const carRevenue = carBookings.reduce((sum, b) => sum + b.totalAmount, 0);
      const carDaysRented = carBookings.reduce((sum, b) => sum + b.rentalDays, 0);
      const carUtilization = Number(((carDaysRented / periodDays) * 100).toFixed(1));

      // Direct expenses for this car
      const carExpensesList = expenses.filter((e) => e.carId === car.id);
      const carExpensesGEL = carExpensesList.reduce((sum, e) => sum + e.amount, 0);
      const carExpensesUSD = Math.round(carExpensesGEL / GEL_USD_RATE);

      const carNetProfit = carRevenue - carExpensesUSD;
      const carMargin = carRevenue > 0 ? Number(((carNetProfit / carRevenue) * 100).toFixed(1)) : 0;

      // Estimated mileage driven during period (approx 130 km per rental day)
      const estimatedKm = carDaysRented * 130;
      const revenuePerKm = estimatedKm > 0 ? Number((carRevenue / estimatedKm).toFixed(2)) : 0;

      return {
        id: car.id,
        plateNumber: car.plateNumber,
        brand: car.brand,
        model: car.model,
        year: car.year,
        color: car.color,
        transmission: car.transmission,
        fuelType: car.fuelType,
        currentMileage: car.currentMileage,
        currentFuelPerc: car.currentFuelPerc,
        status: car.status,
        cityCode: car.city.code,
        cityName: car.city.nameRu,
        bookingsCount: carBookings.length,
        daysRented: carDaysRented,
        idleDays: Math.max(0, periodDays - carDaysRented),
        utilizationRate: Math.min(100, carUtilization),
        revenueUSD: carRevenue,
        expensesUSD: carExpensesUSD,
        expensesGEL: carExpensesGEL,
        netProfitUSD: carNetProfit,
        marginPercent: carMargin,
        estimatedKm,
        revenuePerKm,
      };
    });

    // Sort unit economics by highest revenue
    unitEconomics.sort((a, b) => b.revenueUSD - a.revenueUSD);

    // 5. CITY & BRANCH BREAKDOWN
    const citiesSummary = [
      { code: "TBS", name: "Тбилиси", icon: "🏛️", themeColor: "amber" },
      { code: "BUS", name: "Батуми", icon: "🌊", themeColor: "cyan" },
      { code: "KUT", name: "Кутаиси", icon: "🌿", themeColor: "emerald" },
    ].map((c) => {
      const cityBookings = bookings.filter((b) => b.pickupLocation?.city?.code === c.code);
      const cityRevenue = cityBookings.reduce((sum, b) => sum + b.totalAmount, 0);
      const cityPaidDays = cityBookings.reduce((sum, b) => sum + b.rentalDays, 0);

      const cityFleet = fleetCars.filter((fc) => fc.city?.code === c.code);
      const cityFleetCount = cityFleet.length;
      const cityAvailableDays = cityFleetCount * periodDays;
      const cityUtilization =
        cityAvailableDays > 0 ? Math.min(100, Number(((cityPaidDays / cityAvailableDays) * 100).toFixed(1))) : 0;

      const cityExpensesList = expenses.filter((e) => e.city?.code === c.code);
      const cityExpensesGEL = cityExpensesList.reduce((sum, e) => sum + e.amount, 0);
      const cityExpensesUSD = Math.round(cityExpensesGEL / GEL_USD_RATE);

      // Inbound vs Outbound One-Way
      const outboundOneWay = bookings.filter(
        (b) => b.pickupLocation?.city?.code === c.code && b.returnLocation?.city?.code !== c.code
      ).length;
      const inboundOneWay = bookings.filter(
        (b) => b.pickupLocation?.city?.code !== c.code && b.returnLocation?.city?.code === c.code
      ).length;

      return {
        code: c.code,
        name: c.name,
        icon: c.icon,
        themeColor: c.themeColor,
        revenueUSD: cityRevenue,
        revenueShare: grossRevenueUSD > 0 ? Number(((cityRevenue / grossRevenueUSD) * 100).toFixed(1)) : 0,
        bookingsCount: cityBookings.length,
        paidDays: cityPaidDays,
        fleetCount: cityFleetCount,
        utilizationRate: cityUtilization,
        expensesGEL: cityExpensesGEL,
        expensesUSD: cityExpensesUSD,
        netProfitUSD: cityRevenue - cityExpensesUSD,
        outboundOneWay,
        inboundOneWay,
        netRelocationBalance: inboundOneWay - outboundOneWay,
      };
    });

    // 6. MULTI-ACCOUNT CASH REGISTERS & BALANCES
    const financialAccounts = await prisma.financialAccount.findMany({
      include: { city: true, user: true },
      orderBy: { type: "asc" },
    });

    let totalLiquidUSD = 0;
    let totalCashInRegistersUSD = 0;
    let totalBankAccountsUSD = 0;
    let totalCryptoUSD = 0;

    const formattedAccounts = financialAccounts.map((acc) => {
      let balanceUSD = acc.currentBalance;
      if (acc.currency === "GEL") {
        balanceUSD = Math.round(acc.currentBalance / GEL_USD_RATE);
      }

      totalLiquidUSD += balanceUSD;
      if (acc.type === "CASH") totalCashInRegistersUSD += balanceUSD;
      if (acc.type === "BANK_ACCOUNT") totalBankAccountsUSD += balanceUSD;
      if (acc.type === "CRYPTO_WALLET") totalCryptoUSD += balanceUSD;

      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        bankName: acc.bankName,
        accountNumber: acc.accountNumber,
        currency: acc.currency,
        currentBalance: acc.currentBalance,
        balanceUSD,
        managerResponsible: acc.managerResponsible,
        userId: acc.userId,
        isManagerCash: acc.isManagerCash,
        cityName: acc.city?.nameRu || "Центральный",
        cityCode: acc.city?.code || "ALL",
      };
    });

    // 7. MANAGER PERFORMANCE BREAKDOWN WITH PERSONAL CASH REGISTERS
    const managerMap: Record<
      string,
      { name: string; bookingsCount: number; revenueUSD: number; extrasTotalUSD: number; city: string; cashBalanceGEL: number; cashAccountName?: string }
    > = {};

    filteredBookings.forEach((b) => {
      const mgr = b.handoverReport?.managerName || b.payments[0]?.managerName || "Менеджер смены";
      if (!managerMap[mgr]) {
        // Находим кассу этого менеджера
        const cashAcc = financialAccounts.find((a) =>
          a.type === "CASH" && (a.managerResponsible?.toLowerCase().includes(mgr.toLowerCase()) || mgr.toLowerCase().includes(a.managerResponsible?.toLowerCase() || ""))
        );

        managerMap[mgr] = {
          name: mgr,
          bookingsCount: 0,
          revenueUSD: 0,
          extrasTotalUSD: 0,
          city: b.pickupLocation?.city?.nameRu || "Грузия",
          cashBalanceGEL: cashAcc?.currentBalance || 0,
          cashAccountName: cashAcc?.name,
        };
      }
      managerMap[mgr].bookingsCount += 1;
      managerMap[mgr].revenueUSD += b.totalAmount;
      managerMap[mgr].extrasTotalUSD += b.extrasTotal || 0;
    });

    // Добавляем менеджеров, у которых есть касса, даже если в этом периоде не было броней
    financialAccounts
      .filter((a) => a.type === "CASH" && a.managerResponsible)
      .forEach((a) => {
        const mgrName = a.managerResponsible!;
        if (!managerMap[mgrName]) {
          managerMap[mgrName] = {
            name: mgrName,
            bookingsCount: 0,
            revenueUSD: 0,
            extrasTotalUSD: 0,
            city: a.city?.nameRu || "Грузия",
            cashBalanceGEL: a.currentBalance,
            cashAccountName: a.name,
          };
        }
      });

    const managerPerformance = Object.values(managerMap).sort((a, b) => b.revenueUSD - a.revenueUSD);

    // 8. DAILY REVENUE & EXPENSES TIMELINE (for charts/trends)
    const dailyMap: Record<string, { date: string; dateFormatted: string; revenueUSD: number; expensesUSD: number; bookingsCount: number }> = {};
    const daysToShow = Math.min(periodDays, 14);

    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailyMap[key] = {
        date: key,
        dateFormatted: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
        revenueUSD: 0,
        expensesUSD: 0,
        bookingsCount: 0,
      };
    }

    filteredBookings.forEach((b) => {
      const k = new Date(b.startDate).toISOString().split("T")[0];
      if (dailyMap[k]) {
        dailyMap[k].revenueUSD += b.totalAmount;
        dailyMap[k].bookingsCount += 1;
      }
    });

    expenses.forEach((e) => {
      const k = new Date(e.date).toISOString().split("T")[0];
      if (dailyMap[k]) {
        dailyMap[k].expensesUSD += Math.round(e.amount / GEL_USD_RATE);
      }
    });

    const dailyTimeline = Object.values(dailyMap).reverse();

    return NextResponse.json({
      success: true,
      query: {
        period,
        cityCode,
        tripType,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        periodDays,
      },
      summary: {
        grossRevenueUSD,
        rentalRevenueUSD,
        oneWayRevenueUSD,
        extrasRevenueUSD,
        totalExpensesGEL,
        totalExpensesUSD,
        directCostsUSD,
        grossProfitUSD,
        netOperatingProfitUSD,
        operatingMargin: Number(operatingMargin.toFixed(1)),
        totalPaidDays,
        fleetUtilizationRate: Number(fleetUtilizationRate.toFixed(1)),
        totalFleetCount,
        availableVehicleDays,
        revPAC,
        adrUSD,
        aovUSD,
        alosDays,
        bookingsCount: filteredBookings.length,
        oneWayCount,
        localCount,
        oneWayShare,
      },
      pnl: {
        revenue: {
          rental: rentalRevenueUSD,
          oneWay: oneWayRevenueUSD,
          extras: extrasRevenueUSD,
          total: grossRevenueUSD,
        },
        opex: {
          categories: Object.entries(expensesByCategory).map(([key, val]) => ({
            key,
            ...val,
          })),
          totalGEL: totalExpensesGEL,
          totalUSD: totalExpensesUSD,
        },
        grossProfitUSD,
        netProfitUSD: netOperatingProfitUSD,
        marginPercent: Number(operatingMargin.toFixed(1)),
      },
      cashFlow: {
        totalLiquidUSD,
        totalCashInRegistersUSD,
        totalBankAccountsUSD,
        totalCryptoUSD,
        accounts: formattedAccounts,
      },
      citiesSummary,
      unitEconomics,
      managerPerformance,
      dailyTimeline,
      recentBookings: filteredBookings.slice(0, 8),
      recentExpenses: expenses.slice(0, 8),
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("Reports API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate report analytics" },
      { status: 500 }
    );
  }
}
