import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await connection();
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. Все счета и кассы с балансами (включая привязку к пользователям/менеджерам)
    const accounts = await prisma.financialAccount.findMany({
      include: {
        city: true,
        user: {
          include: { city: true },
        },
      },
      orderBy: {
        type: "asc",
      },
    });

    // 1.1 Получаем инвесторов (владельцев авто), у которых НЕ должно быть касс
    const carOwners = await prisma.carOwner.findMany({ select: { fullName: true } });
    const investorNames = new Set(carOwners.map((o) => o.fullName.trim().toLowerCase()));
    // Известные чистые пассивные инвесторы (у них нет сменных касс)
    ["герман", "артур", "давид", "жора", "илья"].forEach((n) =>
      investorNames.add(n)
    );
    // Руководство и администраторы НЕ являются чистыми инвесторами и ДОЛЖНЫ иметь свои кассы!
    investorNames.delete("андрей колесников");
    investorNames.delete("колесников");
    investorNames.delete("руководство");
    investorNames.delete("павел климов");
    investorNames.delete("климов");
    investorNames.delete("павел");
    investorNames.delete("паша");
    investorNames.delete("георгий шепель");
    investorNames.delete("шепель");
    investorNames.delete("георгий");
    investorNames.delete("максим кириченко");
    investorNames.delete("кириченко");
    investorNames.delete("максим");

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

    // Учет ежемесячных начислений по автомойкам (оплата раз в месяц по реестру)
    let washAccruedTotalGEL = 0;
    let washPendingSettlementGEL = 0;
    let washSettledTotalGEL = 0;
    let washAccruedCount = 0;
    let washPendingCount = 0;

    const expensesByCategory: Record<string, number> = {
      WASHING: 0,
      FUEL: 0,
      MAINTENANCE: 0,
      OWNER_PAYOUT: 0,
      SALARY: 0,
      OFFICE_RENT: 0,
      PARKING_FINES: 0,
      MARKETING: 0,
      OTHER: 0,
    };

    expenses.forEach((e) => {
      // Внутренние межкассовые переводы (инкассация) не являются операционными расходами бизнеса
      if (e.category === "TRANSFER") {
        return;
      }

      const eDate = new Date(e.date);
      const isToday = eDate >= today;
      const isYesterday = eDate >= yesterday && eDate < today;

      expensesTotalGEL += e.amount;
      if (isToday) expensesTodayGEL += e.amount;
      if (isYesterday) expensesYesterdayGEL += e.amount;

      if (e.category === "WASHING") {
        washAccruedTotalGEL += e.amount;
        washAccruedCount += 1;
        if (!e.isMonthlySettled) {
          washPendingSettlementGEL += e.amount;
          washPendingCount += 1;
        } else {
          washSettledTotalGEL += e.amount;
        }
      }

      if (expensesByCategory[e.category] !== undefined) {
        expensesByCategory[e.category] += e.amount;
      } else {
        expensesByCategory.OTHER = (expensesByCategory.OTHER || 0) + e.amount;
      }
    });

    // 5. Разделение счетов: Банки/Крипта компании vs Наличные кассы менеджеров по городам
    let totalCashGEL = 0;
    let totalBankGEL = 0;
    let totalBankUSD = 0;
    let totalCryptoUSD = 0;

    const managerCashAccountsList: any[] = [];
    const companyBankAccountsList: any[] = [];

    accounts.forEach((acc) => {
      if (acc.type === "CASH") {
        totalCashGEL += acc.currentBalance;

        const mgrLower = (acc.managerResponsible || acc.user?.fullName || "").trim().toLowerCase();
        const accNameLower = (acc.name || "").trim().toLowerCase();

        // Полный иммунитет для касс руководства и администраторов (Кириченко, Шепель, Климов, Колесников)
        const isExecutiveLeader =
          mgrLower.includes("кириченко") ||
          accNameLower.includes("кириченко") ||
          mgrLower.includes("шепель") ||
          accNameLower.includes("шепель") ||
          mgrLower.includes("климов") ||
          accNameLower.includes("климов") ||
          mgrLower.includes("колесников") ||
          accNameLower.includes("колесников") ||
          mgrLower.includes("руководство") ||
          accNameLower.includes("руководство");

        // Исключаем ТОЛЬКО чистых инвесторов (OWNER), которые НЕ входят в руководство
        if (!isExecutiveLeader && acc.user && acc.user.role === "OWNER") {
          return;
        }

        let isInvestor = false;
        if (!isExecutiveLeader) {
          for (const name of Array.from(investorNames)) {
            if ((mgrLower && mgrLower.includes(name)) || (accNameLower && accNameLower.includes(name))) {
              isInvestor = true;
              break;
            }
          }
        }
        if (isInvestor) {
          return;
        }
        if (mgrLower.includes("николоз") || accNameLower.includes("николоз")) {
          return;
        }

        // Расчет активности по этой конкретной кассе
        const accPayments = payments.filter((p) => p.accountId === acc.id || (p.managerName && p.managerName.includes(acc.managerResponsible || "")));
        const accExpenses = expenses.filter((e) => e.accountId === acc.id || (e.managerName && e.managerName.includes(acc.managerResponsible || "")));

        const todayIncome = accPayments
          .filter((p) => new Date(p.createdAt) >= today)
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        const todayExpense = accExpenses
          .filter((e) => new Date(e.date) >= today)
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        managerCashAccountsList.push({
          id: acc.id,
          name: acc.name,
          managerName: acc.managerResponsible || acc.user?.fullName || "Менеджер",
          userId: acc.userId,
          cityName: acc.city?.nameRu || (acc.user as any)?.city?.nameRu || "Батуми",
          cityCode: acc.city?.code || (acc.user as any)?.city?.code || "BUS",
          cityId: acc.cityId,
          currency: acc.currency,
          currentBalance: acc.currentBalance,
          initialBalance: acc.initialBalance,
          todayIncome,
          todayExpense,
          totalIncome: accPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
          totalExpense: accExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
        });
      } else {
        if (acc.type === "BANK_ACCOUNT") {
          if (acc.currency === "GEL") totalBankGEL += acc.currentBalance;
          if (acc.currency === "USD") totalBankUSD += acc.currentBalance;
        }
        if (acc.type === "CRYPTO_WALLET") totalCryptoUSD += acc.currentBalance;

        companyBankAccountsList.push({
          id: acc.id,
          name: acc.name,
          type: acc.type,
          bankName: acc.bankName,
          accountNumber: acc.accountNumber,
          currency: acc.currency,
          currentBalance: acc.currentBalance,
          managerResponsible: acc.managerResponsible,
        });
      }
    });

    // Группировка наличных касс: Руководство компании + по городам (Тбилиси, Батуми, Кутаиси)
    const managerCashByCity: Record<string, any[]> = {
      "Руководство": [],
      Тбилиси: [],
      Батуми: [],
      Кутаиси: [],
    };

    managerCashAccountsList.forEach((acc) => {
      const nameL = (acc.name || "").toLowerCase();
      const mgrL = (acc.managerName || "").toLowerCase();

      if (
        nameL.includes("руководство") ||
        nameL.includes("кириченко") ||
        mgrL.includes("кириченко") ||
        nameL.includes("шепель") ||
        mgrL.includes("шепель") ||
        nameL.includes("климов") ||
        mgrL.includes("климов") ||
        nameL.includes("колесников") ||
        mgrL.includes("колесников")
      ) {
        managerCashByCity["Руководство"].push(acc);
      } else {
        const cityKey = acc.cityName || "Батуми";
        if (!managerCashByCity[cityKey]) {
          managerCashByCity[cityKey] = [];
        }
        managerCashByCity[cityKey].push(acc);
      }
    });

    return NextResponse.json({
      success: true,
      kpi: {
        revenueTodayUSD,
        revenueYesterdayUSD,
        revenueTotalUSD,
        revenueTodayGEL,
        revenueYesterdayGEL,
        revenueTotalGEL,
        expensesTodayGEL,
        expensesYesterdayGEL,
        expensesTotalGEL,
        netProfitEstimateUSD: revenueTotalUSD - Math.round(expensesTotalGEL / 2.7),
        totalManagerCashGEL: totalCashGEL,
      },
      washSummary: {
        totalAccruedGEL: washAccruedTotalGEL,
        pendingSettlementGEL: washPendingSettlementGEL,
        settledGEL: washSettledTotalGEL,
        totalCount: washAccruedCount,
        pendingCount: washPendingCount,
      },
      balances: {
        totalCashUSD: totalCashGEL, // Валюта в лари
        totalBankGEL,
        totalBankUSD,
        totalCryptoUSD,
      },
      accounts,
      managerCashAccounts: managerCashAccountsList,
      managerCashByCity,
      companyBankAccounts: companyBankAccountsList,
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

// Проведение инкассации или передачи средств между счетами и кассами менеджеров
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, fromAccountId, toAccountId, amount, notes, managerName = "Руководитель" } = body;

    // Закрытие ежемесячного реестра расчётов с автомойкой
    if (action === "SETTLE_MONTHLY_WASH") {
      const pendingWashes = await prisma.expense.findMany({
        where: {
          category: "WASHING",
          isMonthlySettled: false,
        },
      });

      const totalToSettle = pendingWashes.reduce((sum, e) => sum + e.amount, 0);

      if (totalToSettle > 0) {
        // Помечаем все начисленные расходы по мойкам как урегулированные (оплаченные партнеру)
        await prisma.expense.updateMany({
          where: {
            category: "WASHING",
            isMonthlySettled: false,
          },
          data: {
            isMonthlySettled: true,
            status: "PAID",
          },
        });

        // Помечаем задачи мойки как закрытые
        await prisma.carWashTask.updateMany({
          where: {
            isSettled: false,
          },
          data: {
            isSettled: true,
            settledAt: new Date(),
          },
        });

        // Если указан целевой банковский счет, с которого производится безналичная оплата автомойке
        const targetAccountId = toAccountId || fromAccountId;
        if (targetAccountId) {
          await prisma.financialAccount.update({
            where: { id: targetAccountId },
            data: { currentBalance: { decrement: totalToSettle } },
          });

          await prisma.expense.create({
            data: {
              accountId: targetAccountId,
              category: "WASHING",
              amount: totalToSettle,
              currency: "GEL",
              description: `Оплата ежемесячного счёта автомойке по реестру (${pendingWashes.length} моек)`,
              managerName,
              status: "PAID",
              isMonthlySettled: true,
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Реестр моек успешно закрыт и оплачен на сумму ${totalToSettle} ₾ (${pendingWashes.length} моек)`,
        settledAmount: totalToSettle,
        count: pendingWashes.length,
      });
    }

    if (action === "TRANSFER_CASH") {
      if (!fromAccountId || !toAccountId || !amount) {
        return NextResponse.json(
          { success: false, error: "Укажите кассу отправителя, целевой счёт и сумму" },
          { status: 400 }
        );
      }

      const numAmount = Number(amount);
      if (numAmount <= 0) {
        return NextResponse.json({ success: false, error: "Сумма должна быть положительной" }, { status: 400 });
      }

      const fromAcc = await prisma.financialAccount.findUnique({ where: { id: fromAccountId } });
      const toAcc = await prisma.financialAccount.findUnique({ where: { id: toAccountId } });

      if (!fromAcc || !toAcc) {
        return NextResponse.json({ success: false, error: "Касса или счёт не найдены" }, { status: 404 });
      }

      // Списание с кассы
      await prisma.financialAccount.update({
        where: { id: fromAccountId },
        data: { currentBalance: { decrement: numAmount } },
      });

      // Пополнение целевого счета
      await prisma.financialAccount.update({
        where: { id: toAccountId },
        data: { currentBalance: { increment: numAmount } },
      });

      // Создание проводки в CashTransfer
      const transfer = await prisma.cashTransfer.create({
        data: {
          fromAccountId,
          toAccountId,
          amount: numAmount,
          currency: fromAcc.currency || "GEL",
          senderName: managerName || fromAcc.managerResponsible || fromAcc.name,
          recipientName: toAcc.managerResponsible || toAcc.name,
          notes: notes ? notes.trim() : `Перенос средств: ${fromAcc.name} ➔ ${toAcc.name}`,
        },
      });

      // Запись расхода-инкассации в кассе менеджера
      const expense = await prisma.expense.create({
        data: {
          accountId: fromAccountId,
          category: "TRANSFER",
          amount: numAmount,
          currency: fromAcc.currency || "GEL",
          description: `Инкассация: сдача выручки в «${toAcc.name}» (${notes || "инкассация смены"})`,
          cityId: fromAcc.cityId || undefined,
          managerName,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Инкассация успешно зафиксирована! ${numAmount} ₾ передано в «${toAcc.name}»`,
        expense,
        transfer,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/executive/analytics error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process transfer" },
      { status: 500 }
    );
  }
}
