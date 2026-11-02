import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connection();
  } catch {
    // ignore outside of Next.js request store
  }
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // 1. Поиск финансового источника (касса или счет)
    const account = await prisma.financialAccount.findUnique({
      where: { id },
      include: {
        city: true,
        user: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Финансовый счёт / касса не найдена" },
        { status: 404 }
      );
    }

    // 2. Расчет временных рамок
    const now = new Date();
    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;

    if (period === "today") {
      filterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      filterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      filterStart = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      filterEnd = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
    } else if (period === "month") {
      filterStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === "custom" && startDateParam && endDateParam) {
      filterStart = new Date(`${startDateParam}T00:00:00.000Z`);
      filterEnd = new Date(`${endDateParam}T23:59:59.999Z`);
    }

    // 3. Выборка поступлений (Payments - Аренда, Залоги, Доплаты)
    // Учитываем прямой accountId, а также кассу менеджера по имени (если старая запись)
    const paymentOrConditions: any[] = [{ accountId: id }];
    if (account.type === "CASH" && account.managerResponsible) {
      paymentOrConditions.push({
        managerName: { contains: account.managerResponsible },
        method: "CASH",
      });
    }
    // Если это Credo Bank Андрея
    if (account.name.includes("Credo") || account.bankName === "CREDO") {
      paymentOrConditions.push({ method: "CREDO_BANK" });
    } else if (account.name.includes("TBC") || account.bankName === "TBC") {
      paymentOrConditions.push({ method: "TBC_BANK" });
    } else if (account.name.includes("Georgia") || account.bankName === "BOG") {
      paymentOrConditions.push({ method: "BOG_BANK" });
    } else if (account.type === "CRYPTO_WALLET") {
      paymentOrConditions.push({ method: "CRYPTO" });
    }

    const allPayments = await prisma.payment.findMany({
      where: {
        OR: paymentOrConditions,
      },
      include: {
        booking: {
          include: {
            car: true,
            customer: true,
          },
        },
        account: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 4. Выборка расходов (Expenses - Штрафы, Выплаты инвесторам, Топливо, Мойка, ТО и др.)
    const expenseOrConditions: any[] = [{ accountId: id }];
    if (account.type === "CASH" && account.managerResponsible) {
      expenseOrConditions.push({
        managerName: { contains: account.managerResponsible },
        accountId: id,
      });
    }

    const allExpenses = await prisma.expense.findMany({
      where: {
        OR: expenseOrConditions,
      },
      include: {
        car: true,
        owner: true,
        city: true,
        account: true,
      },
      orderBy: { date: "desc" },
    });

    // 5. Выборка межкассовых переводов (Transfers - Исходящие и Входящие)
    const transfersSent = await prisma.cashTransfer.findMany({
      where: { fromAccountId: id },
      include: {
        toAccount: true,
      },
      orderBy: { date: "desc" },
    });

    const transfersReceived = await prisma.cashTransfer.findMany({
      where: { toAccountId: id },
      include: {
        fromAccount: true,
      },
      orderBy: { date: "desc" },
    });

    // 6. Фильтрация по периоду
    const filteredPayments = allPayments.filter((p) => {
      if (!filterStart || !filterEnd) return true;
      const d = new Date(p.createdAt);
      return d >= filterStart && d <= filterEnd;
    });

    const filteredExpenses = allExpenses.filter((e) => {
      if (!filterStart || !filterEnd) return true;
      const d = new Date(e.date || (e as any).createdAt);
      return d >= filterStart && d <= filterEnd;
    });

    const filteredTransfersSent = transfersSent.filter((t) => {
      if (!filterStart || !filterEnd) return true;
      const d = new Date(t.date || t.createdAt);
      return d >= filterStart && d <= filterEnd;
    });

    const filteredTransfersReceived = transfersReceived.filter((t) => {
      if (!filterStart || !filterEnd) return true;
      const d = new Date(t.date || t.createdAt);
      return d >= filterStart && d <= filterEnd;
    });

    // 7. Формирование единого реестра операций (Ledger entries)
    const ledgerEntries: any[] = [];

    // Поступления
    filteredPayments.forEach((p) => {
      const typeLabel =
        p.type === "RENTAL"
          ? "Аренда автомобиля"
          : p.type === "DEPOSIT"
          ? "Залог / Депозит"
          : p.type === "DELIVERY"
          ? "Доставка авто (One-Way)"
          : "Дополнительные услуги";

      const carInfo = p.booking?.car
        ? `${p.booking.car.brand} ${p.booking.car.model} (${p.booking.car.plateNumber})`
        : null;

      ledgerEntries.push({
        id: `pay-${p.id}`,
        rawId: p.id,
        date: p.createdAt.toISOString(),
        direction: "INFLOW", // Поступление (+)
        category: typeLabel,
        categoryCode: p.type,
        amount: p.amount,
        currency: p.currency,
        title: carInfo ? `${typeLabel}: ${carInfo}` : typeLabel,
        description: p.notes || (p.booking ? `Бронь № ${p.booking.bookingNumber}` : "Оплата"),
        method: p.method,
        managerName: p.managerName || account.managerResponsible || "Менеджер",
        car: p.booking?.car
          ? {
              id: p.booking.car.id,
              brand: p.booking.car.brand,
              model: p.booking.car.model,
              plateNumber: p.booking.car.plateNumber,
              year: p.booking.car.year,
            }
          : null,
        booking: p.booking
          ? {
              id: p.booking.id,
              bookingNumber: p.booking.bookingNumber,
              startDate: p.booking.startDate,
              endDate: p.booking.endDate,
              status: p.booking.status,
            }
          : null,
        customer: p.booking?.customer
          ? {
              id: p.booking.customer.id,
              fullName: p.booking.customer.fullName,
              phone: p.booking.customer.phone,
            }
          : null,
        changeOnReturn: p.changeOnReturn,
      });
    });

    // Расходы
    filteredExpenses.forEach((e) => {
      let catLabel = "Расход";
      if (e.category === "FUEL") catLabel = "Топливо / Бензин";
      else if (e.category === "WASHING") catLabel = "Мойка авто";
      else if (e.category === "MAINTENANCE") catLabel = "ТО и сервис";
      else if (e.category === "PARKING_FINES" || e.category === "FINES") catLabel = "Штрафы патрульной полиции";
      else if (e.category === "OWNER_PAYOUT") catLabel = "Выплата инвестору / владельцу";
      else if (e.category === "SALARY") catLabel = "Зарплата сотрудникам";
      else if (e.category === "OFFICE_RENT" || e.category === "OFFICE") catLabel = "Офис / хозрасходы";
      else catLabel = `Расход: ${e.category}`;

      const carInfo = e.car ? `${e.car.brand} ${e.car.model} (${e.car.plateNumber})` : null;

      ledgerEntries.push({
        id: `exp-${e.id}`,
        rawId: e.id,
        date: (e.date || (e as any).createdAt).toISOString(),
        direction: "OUTFLOW", // Списание (-)
        category: catLabel,
        categoryCode: e.category,
        amount: e.amount,
        currency: e.currency,
        title: carInfo ? `${catLabel}: ${carInfo}` : (e.owner ? `${catLabel} (${e.owner.fullName})` : catLabel),
        description: e.description || "Расходная операция",
        managerName: e.managerName || account.managerResponsible || "Менеджер",
        car: e.car
          ? {
              id: e.car.id,
              brand: e.car.brand,
              model: e.car.model,
              plateNumber: e.car.plateNumber,
            }
          : null,
        owner: e.owner
          ? {
              id: e.owner.id,
              fullName: e.owner.fullName,
              phone: e.owner.phone,
            }
          : null,
        status: e.status,
      });
    });

    // Исходящие переводы
    filteredTransfersSent.forEach((t) => {
      ledgerEntries.push({
        id: `tr-out-${t.id}`,
        rawId: t.id,
        date: (t.date || t.createdAt).toISOString(),
        direction: "TRANSFER_OUT", // Перевод из этой кассы (-)
        category: "Межкассовый перевод (сдано)",
        categoryCode: "TRANSFER_OUT",
        amount: t.amount,
        currency: t.currency,
        title: `Перевод в: ${t.toAccount.name}`,
        description: t.notes || `Сдано из кассы ${account.name} в ${t.toAccount.name}`,
        managerName: t.senderName || account.managerResponsible,
        targetAccount: {
          id: t.toAccount.id,
          name: t.toAccount.name,
          managerResponsible: t.toAccount.managerResponsible,
        },
      });
    });

    // Входящие переводы
    filteredTransfersReceived.forEach((t) => {
      ledgerEntries.push({
        id: `tr-in-${t.id}`,
        rawId: t.id,
        date: (t.date || t.createdAt).toISOString(),
        direction: "TRANSFER_IN", // Перевод в эту кассу (+)
        category: "Межкассовый перевод (получено)",
        categoryCode: "TRANSFER_IN",
        amount: t.amount,
        currency: t.currency,
        title: `Получено из: ${t.fromAccount.name}`,
        description: t.notes || `Получено в кассу ${account.name} от ${t.fromAccount.name}`,
        managerName: t.recipientName || account.managerResponsible,
        sourceAccount: {
          id: t.fromAccount.id,
          name: t.fromAccount.name,
          managerResponsible: t.fromAccount.managerResponsible,
        },
      });
    });

    // Сортировка всех операций по дате от самых свежих к старым
    ledgerEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 8. Подсчет итогов за период
    const totalInflow = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalOutflow = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalTransfersSent = filteredTransfersSent.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalTransfersReceived = filteredTransfersReceived.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Сводка по категориям расходов
    const expensesByCategory: Record<string, number> = {
      fines: 0,
      investorPayout: 0,
      fuel: 0,
      washing: 0,
      maintenance: 0,
      salary: 0,
      other: 0,
    };

    filteredExpenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      if (e.category === "PARKING_FINES" || e.category === "FINES") expensesByCategory.fines += amt;
      else if (e.category === "OWNER_PAYOUT") expensesByCategory.investorPayout += amt;
      else if (e.category === "FUEL") expensesByCategory.fuel += amt;
      else if (e.category === "WASHING") expensesByCategory.washing += amt;
      else if (e.category === "MAINTENANCE") expensesByCategory.maintenance += amt;
      else if (e.category === "SALARY") expensesByCategory.salary += amt;
      else expensesByCategory.other += amt;
    });

    // Сводка по категориям доходов
    const inflowByCategory: Record<string, number> = {
      rental: 0,
      deposit: 0,
      delivery: 0,
      extra: 0,
    };

    filteredPayments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      if (p.type === "RENTAL") inflowByCategory.rental += amt;
      else if (p.type === "DEPOSIT") inflowByCategory.deposit += amt;
      else if (p.type === "DELIVERY") inflowByCategory.delivery += amt;
      else inflowByCategory.extra += amt;
    });

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        type: account.type,
        currency: account.currency,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        managerResponsible: account.managerResponsible,
        initialBalance: account.initialBalance,
        currentBalance: account.currentBalance,
        cityName: account.city?.nameRu || null,
        cityCode: account.city?.code || null,
      },
      summary: {
        currentBalance: account.currentBalance,
        totalInflow,
        totalOutflow,
        totalTransfersReceived,
        totalTransfersSent,
        netCashFlow: totalInflow + totalTransfersReceived - totalOutflow - totalTransfersSent,
        inflowByCategory,
        expensesByCategory,
        counts: {
          inflowCount: filteredPayments.length,
          outflowCount: filteredExpenses.length,
          transfersCount: filteredTransfersSent.length + filteredTransfersReceived.length,
          totalOperations: ledgerEntries.length,
        },
      },
      ledgerEntries,
    });
  } catch (error: any) {
    console.error("GET /api/finance/accounts/[id]/ledger error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch account ledger" },
      { status: 500 }
    );
  }
}
