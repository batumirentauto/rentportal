import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerIdParam = searchParams.get("ownerId");
    const period = searchParams.get("period") || "thisMonth"; // "thisMonth", "30days", "all"

    // 1. Fetch all owners for switcher
    const allOwners = await prisma.carOwner.findMany({
      include: {
        cars: {
          include: { city: true },
        },
      },
      orderBy: { fullName: "asc" },
    });

    const fleetCars = await prisma.car.findMany({
      where: { isArchived: false },
      select: {
        id: true,
        brand: true,
        model: true,
        plateNumber: true,
        ownerId: true,
        defaultOwnerDailyRate: true,
        city: { select: { code: true, nameRu: true } },
      },
      orderBy: [{ brand: "asc" }, { model: "asc" }, { plateNumber: "asc" }],
    });

    if (allOwners.length === 0) {
      return NextResponse.json({
        success: true,
        owners: [],
        selectedOwner: null,
        fleetCars,
      });
    }

    // Select active owner
    const selectedOwnerId = ownerIdParam || allOwners[0].id;
    const owner = await prisma.carOwner.findUnique({
      where: { id: selectedOwnerId },
      include: {
        cars: {
          include: {
            city: true,
            bookings: {
              where: { status: { notIn: ["CANCELLED"] } },
              include: {
                customer: true,
                pickupLocation: { include: { city: true } },
                returnLocation: { include: { city: true } },
              },
              orderBy: { startDate: "desc" },
            },
          },
        },
        payouts: {
          orderBy: { paidAt: "desc" },
        },
      },
    });

    if (!owner) {
      return NextResponse.json(
        { success: false, error: "Owner not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    let startDate = new Date();
    if (period === "thisMonth") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "30days") {
      startDate.setDate(startDate.getDate() - 30);
    } else {
      // all
      startDate = new Date(2020, 0, 1);
    }

    // Calculate metrics for owner's cars
    let totalOwnerEarningsUSD = 0;
    let totalDaysRented = 0;
    let activeRentedCarsNow = 0;

    // Collect all bookings for owner's cars
    const ownerBookingsList: any[] = [];

    // Fetch expenses for owner's cars (ТО, ремонты, страховки, шины, техосмотр)
    const ownerCarIds = owner.cars.map((c) => c.id);
    const ownerExpenses = await prisma.expense.findMany({
      where: {
        OR: [
          { ownerId: selectedOwnerId },
          { carId: { in: ownerCarIds }, isOwnerExpense: true },
        ],
      },
      include: {
        car: true,
      },
      orderBy: { date: "desc" },
    });

    const totalOwnerExpensesGEL = ownerExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const ownerCarsSummary = owner.cars.map((car) => {
      const isCurrentlyRented = car.status === "RENTED";
      if (isCurrentlyRented) activeRentedCarsNow++;

      // Active booking right now
      const activeBooking = car.bookings.find((b) => b.status === "ACTIVE") || null;

      // Period bookings
      const periodBookings = car.bookings.filter((b) => new Date(b.startDate) >= startDate);
      let carEarnings = 0;
      let carDays = 0;

      periodBookings.forEach((b) => {
        const rate = b.ownerDailyRate || car.defaultOwnerDailyRate || 25;
        const payout = b.ownerTotalPayout || rate * b.rentalDays;
        carEarnings += payout;
        carDays += b.rentalDays;

        ownerBookingsList.push({
          bookingId: b.id,
          bookingNumber: b.bookingNumber,
          carId: car.id,
          carBrand: car.brand,
          carModel: car.model,
          carPlate: car.plateNumber,
          customerName: b.customer?.fullName,
          startDate: b.startDate,
          endDate: b.endDate,
          rentalDays: b.rentalDays,
          status: b.status,
          pickupCity: b.pickupLocation?.city?.nameRu || "Грузия",
          defaultCarRate: car.defaultOwnerDailyRate,
          ownerDailyRate: rate,
          ownerTotalPayout: payout,
          isRateAdjusted: rate !== car.defaultOwnerDailyRate,
          createdAt: b.createdAt,
        });
      });

      totalOwnerEarningsUSD += carEarnings;
      totalDaysRented += carDays;

      // Days in period for utilization calculation
      const daysInPeriod = period === "thisMonth" ? now.getDate() : 30;
      const utilizationRate = Math.min(100, Math.round((carDays / daysInPeriod) * 100));

      const carExpenses = ownerExpenses
        .filter((e) => e.carId === car.id)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const netProfit = carEarnings - carExpenses;

      return {
        id: car.id,
        plateNumber: car.plateNumber,
        brand: car.brand,
        model: car.model,
        year: car.year,
        color: car.color,
        cityName: car.city.nameRu,
        cityCode: car.city.code,
        status: car.status,
        currentMileage: car.currentMileage,
        currentFuelPerc: car.currentFuelPerc,
        defaultOwnerDailyRate: car.defaultOwnerDailyRate,
        daysRented: carDays,
        utilizationRate,
        earnedUSD: carEarnings,
        expensesGEL: carExpenses,
        netProfitGEL: netProfit,
        hasBatumiParking: car.hasBatumiParking,
        batumiParkingPermitNumber: car.batumiParkingPermitNumber,
        batumiParkingExpiresAt: car.batumiParkingExpiresAt,
        hasGpsTracker: car.hasGpsTracker,
        gpsMonthlyFee: car.gpsMonthlyFee || 10,
        isGpsFeeChargedToOwner: car.isGpsFeeChargedToOwner,
        activeBooking: activeBooking
          ? {
              bookingNumber: activeBooking.bookingNumber,
              customerName: activeBooking.customer?.fullName,
              returnDate: activeBooking.endDate,
            }
          : null,
      };
    });

    // Payouts calculation
    const totalPaidOutUSD = owner.payouts.reduce((sum, p) => sum + p.amount, 0);
    const pendingBalanceUSD = Math.max(0, totalOwnerEarningsUSD - totalPaidOutUSD);
    const netProfitInvestorGEL = totalOwnerEarningsUSD - totalOwnerExpensesGEL;

    // Sort bookings descending by date
    ownerBookingsList.sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );

    return NextResponse.json({
      success: true,
      owners: allOwners.map((o) => ({
        id: o.id,
        fullName: o.fullName,
        phone: o.phone,
        carsCount: o.cars.length,
        cities: Array.from(new Set(o.cars.map((c) => c.city.nameRu))),
      })),
      selectedOwner: {
        id: owner.id,
        fullName: owner.fullName,
        phone: owner.phone,
        email: owner.email,
        whatsapp: owner.whatsapp,
        bankName: owner.bankName,
        bankIban: owner.bankIban,
        payoutCurrency: owner.payoutCurrency,
        chargeGpsMonthly: owner.chargeGpsMonthly,
        notes: owner.notes,
      },
      metrics: {
        totalCarsCount: owner.cars.length,
        activeRentedCarsNow,
        totalOwnerEarningsUSD,
        totalOwnerExpensesGEL,
        netProfitInvestorGEL,
        totalDaysRented,
        averageDailyRateUSD:
          totalDaysRented > 0 ? Math.round(totalOwnerEarningsUSD / totalDaysRented) : 0,
        totalPaidOutUSD,
        pendingBalanceUSD,
      },
      cars: ownerCarsSummary,
      bookings: ownerBookingsList,
      payouts: owner.payouts,
      expenses: ownerExpenses.map((e) => ({
        id: e.id,
        carId: e.carId,
        carBrand: e.car?.brand,
        carModel: e.car?.model,
        carPlate: e.car?.plateNumber,
        category: e.category,
        amount: e.amount,
        currency: e.currency,
        description: e.description,
        receiptPhotoUrl: e.receiptPhotoUrl,
        date: e.date,
        managerName: e.managerName,
      })),
      fleetCars,
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("GET /api/owners/portal error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load owner portal data" },
      { status: 500 }
    );
  }
}

// Обновление ставок владельца (базовой ставки по авто или скорректированной ставки для конкретной брони)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { action, carId, defaultOwnerDailyRate, bookingId, ownerDailyRate, ownerTotalPayout } = body;

    // 1. Корректировка базовой суточной ставки авто
    if (action === "UPDATE_CAR_DEFAULT_RATE" && carId) {
      const car = await prisma.car.update({
        where: { id: carId },
        data: {
          defaultOwnerDailyRate: Number(defaultOwnerDailyRate),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Базовая ставка владельца для автомобиля успешно обновлена!",
        car,
      });
    }

    // 2. Корректировка индивидуальной ставки владельца по конкретной брони (например, скидка на длинную аренду)
    if (action === "UPDATE_BOOKING_RATE" && bookingId) {
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) {
        return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
      }

      const rate = Number(ownerDailyRate);
      const total = ownerTotalPayout ? Number(ownerTotalPayout) : rate * booking.rentalDays;

      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          ownerDailyRate: rate,
          ownerTotalPayout: total,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Ставка владельца и выплата по бронированию успешно скорректированы!",
        booking: updated,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("PATCH /api/owners/portal error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update owner rates" },
      { status: 500 }
    );
  }
}

// Зафиксировать выплату владельцу или внести расход на автомобиль владельца
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ownerId, carId, category, amount, currency = "GEL", description, receiptPhotoUrl, date, expenseId, paymentMethod = "BANK_TRANSFER", notes } = body;

    // 0. Создание нового личного кабинета владельца (инвестора) и привязка авто
    if (action === "CREATE_OWNER") {
      const { fullName, phone, email, whatsapp, bankName, bankIban, notes, carIds, defaultOwnerDailyRate = 25 } = body;
      if (!fullName || !phone) {
        return NextResponse.json(
          { success: false, error: "Укажите имя и телефон владельца" },
          { status: 400 }
        );
      }

      const newOwner = await prisma.carOwner.create({
        data: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email ? email.trim() : null,
          whatsapp: whatsapp ? whatsapp.trim() : phone.trim(),
          bankName: bankName ? bankName.trim() : null,
          bankIban: bankIban ? bankIban.trim() : null,
          notes: notes ? notes.trim() : null,
        },
      });

      // Привязываем выбранные автомобили
      if (Array.isArray(carIds) && carIds.length > 0) {
        await prisma.car.updateMany({
          where: { id: { in: carIds } },
          data: {
            ownerId: newOwner.id,
            defaultOwnerDailyRate: Number(defaultOwnerDailyRate) || 25,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Личный кабинет инвестора «${newOwner.fullName}» успешно создан! Привязано авто: ${carIds?.length || 0}`,
        owner: newOwner,
      });
    }

    // 0.5. Обновление списка привязанных автомобилей инвестора
    if (action === "UPDATE_OWNER_CARS") {
      const { targetOwnerId, carIds, defaultOwnerDailyRate } = body;
      const oId = targetOwnerId || ownerId;
      if (!oId) {
        return NextResponse.json({ success: false, error: "ownerId required" }, { status: 400 });
      }

      // Отвязываем автомобили, которые сняты с этого владельца
      await prisma.car.updateMany({
        where: {
          ownerId: oId,
          id: { notIn: Array.isArray(carIds) ? carIds : [] },
        },
        data: { ownerId: null },
      });

      // Привязываем выбранные автомобили
      if (Array.isArray(carIds) && carIds.length > 0) {
        const updateData: any = { ownerId: oId };
        if (defaultOwnerDailyRate) {
          updateData.defaultOwnerDailyRate = Number(defaultOwnerDailyRate);
        }
        await prisma.car.updateMany({
          where: { id: { in: carIds } },
          data: updateData,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Автомобили инвестора успешно обновлены! Привязано авто: ${carIds?.length || 0}`,
      });
    }

    // 0.6. Удаление владельца
    if (action === "DELETE_OWNER") {
      const oId = body.targetOwnerId || ownerId;
      if (!oId) {
        return NextResponse.json({ success: false, error: "ownerId required" }, { status: 400 });
      }
      // Отвязать автомобили
      await prisma.car.updateMany({
        where: { ownerId: oId },
        data: { ownerId: null },
      });
      await prisma.carOwner.delete({
        where: { id: oId },
      });
      return NextResponse.json({
        success: true,
        message: "Кабинет инвестора удален. Все его автомобили отвязаны.",
      });
    }

    // 1. Добавление расхода владельцем на свой автомобиль (ТО, ремонт, КАСКО, шины)
    if (action === "ADD_EXPENSE") {
      if (!ownerId || !amount || !description) {
        return NextResponse.json(
          { success: false, error: "Укажите владельца, сумму и описание расхода" },
          { status: 400 }
        );
      }

      let carCityId: string | undefined;
      if (carId) {
        const car = await prisma.car.findUnique({ where: { id: carId } });
        carCityId = car?.cityId;
      }

      let account = await prisma.financialAccount.findFirst({ where: { currency: "GEL" } });
      if (!account) {
        account = await prisma.financialAccount.findFirst();
      }

      if (!account) {
        return NextResponse.json({ success: false, error: "Касса для списания не найдена" }, { status: 400 });
      }

      const owner = await prisma.carOwner.findUnique({ where: { id: ownerId } });

      const expense = await prisma.expense.create({
        data: {
          accountId: account.id,
          ownerId,
          carId: carId || undefined,
          cityId: carCityId,
          category: category || "MAINTENANCE",
          amount: Number(amount),
          currency,
          description,
          receiptPhotoUrl: receiptPhotoUrl || undefined,
          isOwnerExpense: true,
          managerName: owner ? `Инвестор: ${owner.fullName}` : "Владелец автомобиля",
          date: date ? new Date(date) : new Date(),
        },
        include: { car: true },
      });

      return NextResponse.json({
        success: true,
        message: "Расход успешно сохранён в журнале инвестора!",
        expense,
      });
    }

    // 2. Удаление расхода инвестором
    if (action === "DELETE_EXPENSE" && expenseId) {
      await prisma.expense.delete({
        where: { id: expenseId },
      });
      return NextResponse.json({
        success: true,
        message: "Расход успешно удален",
      });
    }

    // 2.5. Начисление ежемесячной абонплаты за GPS (10 лари на 1 автомобиль)
    if (action === "CHARGE_MONTHLY_GPS") {
      if (!ownerId) {
        return NextResponse.json({ success: false, error: "ownerId required" }, { status: 400 });
      }

      const ownerObj = await prisma.carOwner.findUnique({
        where: { id: ownerId },
        include: { cars: true },
      });

      if (!ownerObj) {
        return NextResponse.json({ success: false, error: "Owner not found" }, { status: 404 });
      }

      const defaultAcc = await prisma.financialAccount.findFirst({ where: { currency: "GEL" } }) || await prisma.financialAccount.findFirst();
      if (!defaultAcc) {
        return NextResponse.json({ success: false, error: "Касса не найдена" }, { status: 400 });
      }

      // Находим автомобили с включенным GPS
      const eligibleCars = ownerObj.cars.filter((c) => c.hasGpsTracker && c.isGpsFeeChargedToOwner);

      if (eligibleCars.length === 0) {
        return NextResponse.json({
          success: false,
          error: "У этого владельца нет автомобилей с активной абонплатой за GPS",
        }, { status: 400 });
      }

      const currentMonthName = new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
      const createdExpenses = [];

      for (const car of eligibleCars) {
        const fee = car.gpsMonthlyFee || 10;
        const exp = await prisma.expense.create({
          data: {
            accountId: defaultAcc.id,
            ownerId: ownerObj.id,
            carId: car.id,
            category: "GPS_TRACKER",
            amount: fee,
            currency: "GEL",
            description: `Абонентская плата за GPS-трекер (${currentMonthName}) — ${car.brand} ${car.model} (${car.plateNumber})`,
            isOwnerExpense: true,
            managerName: "Система GPS VSL",
            date: new Date(),
          },
        });
        createdExpenses.push(exp);
      }

      return NextResponse.json({
        success: true,
        message: `Успешно начислена абонплата за GPS на ${eligibleCars.length} авто на сумму ${eligibleCars.length * 10} ₾ (${currentMonthName})`,
        count: eligibleCars.length,
        totalGEL: eligibleCars.length * 10,
      });
    }

    // 2.6. Опциональное включение / отключение списания GPS для владельца
    if (action === "TOGGLE_OWNER_GPS_CHARGE") {
      const { ownerId, chargeGpsMonthly } = body;
      const updated = await prisma.carOwner.update({
        where: { id: ownerId },
        data: { chargeGpsMonthly: Boolean(chargeGpsMonthly) },
      });
      return NextResponse.json({
        success: true,
        message: "Настройки начисления GPS обновлены!",
        owner: updated,
      });
    }

    // 3. Выплата инвестору (стандартный сценарий)
    if (!ownerId || !amount) {
      return NextResponse.json(
        { success: false, error: "ownerId and amount are required" },
        { status: 400 }
      );
    }

    const payout = await prisma.ownerPayout.create({
      data: {
        ownerId,
        amount: Number(amount),
        currency: currency || "GEL",
        status: "PAID",
        paymentMethod,
        notes: notes || `Выплата владельцу (${paymentMethod})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Выплата владельцу авто успешно зафиксирована в реестре!",
      payout,
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("POST /api/owners/portal error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process owner action" },
      { status: 500 }
    );
  }
}
