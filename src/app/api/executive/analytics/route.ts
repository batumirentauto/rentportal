import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. Все счета и кассы с балансами
    const accounts = await prisma.financialAccount.findMany({
      include: {
        city: true,
      },
      orderBy: {
        type: "asc",
      },
    });

    // 2. Все платежи и расходы
    const payments = await prisma.payment.findMany({
      include: {
        account: true,
        booking: {
          include: {
            car: {
              include: { city: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const expenses = await prisma.expense.findMany({
      include: {
        account: true,
        city: true,
        car: true,
      },
      orderBy: { date: "desc" },
    });

    // 3. Расчет выручки: Сегодня vs Вчера vs Всего
    let revenueTodayUSD = 0;
    let revenueYesterdayUSD = 0;
    let revenueTotalUSD = 0;

    let revenueTodayGEL = 0;
    let revenueYesterdayGEL = 0;
    let revenueTotalGEL = 0;

    // Структура выручки по категориям
    const revenueByCategory = {
      RENTAL: 0,
      DELIVERY: 0,
      EXTRA: 0,
      DEPOSIT: 0,
    };

    // Выручка по городам
    const revenueByCity: Record<string, number> = {
      Тбилиси: 0,
      Батуми: 0,
      Кутаиси: 0,
    };

    // Выручка по дням (последние 7 дней)
    const dailyInflowMap: Record<string, { date: string; amountUSD: number; amountGEL: number; count: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailyInflowMap[key] = {
        date: d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }),
        amountUSD: 0,
        amountGEL: 0,
        count: 0,
      };
    }

    payments.forEach((p) => {
      const pDate = new Date(p.createdAt);
      const isToday = pDate >= today;
      const isYesterday = pDate >= yesterday && pDate < today;
      const dateKey = pDate.toISOString().split("T")[0];

      if (p.currency === "USD") {
        revenueTotalUSD += p.amount;
        if (isToday) revenueTodayUSD += p.amount;
        if (isYesterday) revenueYesterdayUSD += p.amount;
        if (dailyInflowMap[dateKey]) {
          dailyInflowMap[dateKey].amountUSD += p.amount;
          dailyInflowMap[dateKey].count += 1;
        }
      } else if (p.currency === "GEL") {
        revenueTotalGEL += p.amount;
        if (isToday) revenueTodayGEL += p.amount;
        if (isYesterday) revenueYesterdayGEL += p.amount;
        if (dailyInflowMap[dateKey]) {
          dailyInflowMap[dateKey].amountGEL += p.amount;
          dailyInflowMap[dateKey].count += 1;
        }
      }

      // Категория
      if (revenueByCategory[p.type as keyof typeof revenueByCategory] !== undefined) {
        revenueByCategory[p.type as keyof typeof revenueByCategory] += p.amount;
      }

      // Город
      const cityName = p.booking?.car?.city?.nameRu;
      if (cityName && revenueByCity[cityName] !== undefined) {
        revenueByCity[cityName] += p.amount;
      }
    });

    // 4. Расчет расходов: Сегодня vs Вчера vs Всего
    let expensesTodayGEL = 0;
    let expensesYesterdayGEL = 0;
    let expensesTotalGEL = 0;

    const expensesByCategory: Record<string, number> = {
      WASHING: 0,
      FUEL: 0,
      MAINTENANCE: 0,
      SALARY: 0,
      OFFICE_RENT: 0,
      PARKING_FINES: 0,
      MARKETING: 0,
      OTHER: 0,
    };

    expenses.forEach((e) => {
      const eDate = new Date(e.date);
      const isToday = eDate >= today;
      const isYesterday = eDate >= yesterday && eDate < today;

      expensesTotalGEL += e.amount;
      if (isToday) expensesTodayGEL += e.amount;
      if (isYesterday) expensesYesterdayGEL += e.amount;

      if (expensesByCategory[e.category] !== undefined) {
        expensesByCategory[e.category] += e.amount;
      } else {
        expensesByCategory.OTHER = (expensesByCategory.OTHER || 0) + e.amount;
      }
    });

    // 5. Суммы на счетах и в кассах
    let totalCashUSD = 0;
    let totalBankGEL = 0;
    let totalBankUSD = 0;
    let totalCryptoUSD = 0;

    accounts.forEach((acc) => {
      if (acc.type === "CASH") totalCashUSD += acc.currentBalance;
      if (acc.type === "BANK_ACCOUNT") {
        if (acc.currency === "GEL") totalBankGEL += acc.currentBalance;
        if (acc.currency === "USD") totalBankUSD += acc.currentBalance;
      }
      if (acc.type === "CRYPTO_WALLET") totalCryptoUSD += acc.currentBalance;
    });

    return NextResponse.json({
      success: true,
      kpi: {
        revenueTodayUSD,
        revenueYesterdayUSD,
        revenueTotalUSD,
        expensesTodayGEL,
        expensesYesterdayGEL,
        expensesTotalGEL,
        netProfitEstimateUSD: revenueTotalUSD - Math.round(expensesTotalGEL / 2.7), // примерный курс 2.7 лари/$
      },
      balances: {
        totalCashUSD,
        totalBankGEL,
        totalBankUSD,
        totalCryptoUSD,
      },
      accounts,
      revenueByCategory,
      revenueByCity,
      expensesByCategory,
      dailyInflow: Object.values(dailyInflowMap).reverse(),
      recentExpenses: expenses.slice(0, 10),
      recentPayments: payments.slice(0, 10),
    });
  } catch (error) {
    console.error("Executive analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load executive analytics" },
      { status: 500 }
    );
  }
}
