import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";

function getTbilisiDateRange(startDateStr: string, endDateStr: string) {
  // Georgia timezone is UTC+4 (Asia/Tbilisi) without DST
  const start = new Date(`${startDateStr}T00:00:00.000+04:00`);
  const end = new Date(`${endDateStr}T23:59:59.999+04:00`);
  return { start, end };
}

export async function GET(request: Request) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const todayTbilisi = new Date(Date.now() + 4 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const startDateStr = searchParams.get("startDate") || todayTbilisi;
    const endDateStr = searchParams.get("endDate") || startDateStr;

    const { start, end } = getTbilisiDateRange(startDateStr, endDateStr);

    const [
      handoverReports,
      bookingsStartedInPeriod,
      payments,
      expenses,
      transfers,
      refunds,
      accounts,
    ] = await Promise.all([
      prisma.handoverReport.findMany({
        where: {
          handedOverAt: { gte: start, lte: end },
        },
        include: {
          car: true,
          booking: {
            include: {
              customer: true,
              pickupLocation: { include: { city: true } },
              payments: {
                include: { account: true },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
        orderBy: { handedOverAt: "asc" },
      }),
      prisma.booking.findMany({
        where: {
          startDate: { gte: start, lte: end },
          status: { in: ["ACTIVE", "COMPLETED"] },
        },
        include: {
          car: true,
          customer: true,
          handoverReport: true,
          pickupLocation: { include: { city: true } },
          payments: {
            include: { account: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { startDate: "asc" },
      }),
      prisma.payment.findMany({
        where: {
          createdAt: { gte: start, lte: end },
        },
        include: {
          account: true,
          booking: {
            include: {
              car: true,
              customer: true,
              handoverReport: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.expense.findMany({
        where: {
          date: { gte: start, lte: end },
        },
        include: {
          account: true,
          car: true,
          city: true,
          owner: true,
        },
        orderBy: { date: "asc" },
      }),
      prisma.cashTransfer.findMany({
        where: {
          date: { gte: start, lte: end },
        },
        include: {
          fromAccount: true,
          toAccount: true,
        },
        orderBy: { date: "asc" },
      }),
      prisma.bookingRefund.findMany({
        where: {
          date: { gte: start, lte: end },
        },
        include: {
          account: true,
          booking: {
            include: {
              car: true,
              customer: true,
            },
          },
        },
        orderBy: { date: "asc" },
      }),
      prisma.financialAccount.findMany({
        include: {
          city: true,
          user: { select: { id: true, fullName: true, role: true } },
        },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      }),
    ]);

    // Merge handovers + ACTIVE/COMPLETED bookings started in period (dedup by bookingId)
    const issuedMap = new Map<string, any>();

    for (const hr of handoverReports) {
      if (!hr.booking) continue;
      issuedMap.set(hr.bookingId, {
        bookingId: hr.bookingId,
        bookingNumber: hr.booking.bookingNumber,
        issuedAt: hr.handedOverAt,
        actualHandoverTime: hr.actualHandoverTime || null,
        carName: `${hr.car.brand} ${hr.car.model}`,
        plateNumber: hr.car.plateNumber,
        customerName: hr.booking.customer?.fullName || "Клиент",
        rentalDays: hr.booking.rentalDays,
        totalAmount: hr.booking.totalAmount,
        depositAmount: hr.booking.depositAmount,
        currency: hr.booking.currency || "GEL",
        managerName: hr.managerName || hr.booking.payments[0]?.managerName || "Не указан",
        cityName: hr.booking.pickupLocation?.city?.nameRu || "",
        payments: hr.booking.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          method: p.method,
          type: p.type,
          accountName: p.account?.name || null,
          managerName: p.managerName || null,
          createdAt: p.createdAt,
        })),
      });
    }

    for (const b of bookingsStartedInPeriod) {
      if (issuedMap.has(b.id)) continue;
      issuedMap.set(b.id, {
        bookingId: b.id,
        bookingNumber: b.bookingNumber,
        issuedAt: b.handoverReport?.handedOverAt || b.startDate,
        actualHandoverTime: b.handoverReport?.actualHandoverTime || null,
        carName: `${b.car.brand} ${b.car.model}`,
        plateNumber: b.car.plateNumber,
        customerName: b.customer?.fullName || "Клиент",
        rentalDays: b.rentalDays,
        totalAmount: b.totalAmount,
        depositAmount: b.depositAmount,
        currency: b.currency || "GEL",
        managerName:
          b.handoverReport?.managerName || b.payments[0]?.managerName || "Не указан",
        cityName: b.pickupLocation?.city?.nameRu || "",
        payments: b.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          method: p.method,
          type: p.type,
          accountName: p.account?.name || null,
          managerName: p.managerName || null,
          createdAt: p.createdAt,
        })),
      });
    }

    const issuedCars = Array.from(issuedMap.values()).sort(
      (a, b) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime()
    );

    // Per-account breakdown for the selected period + current balance
    const accountBreakdown = accounts.map((acc) => {
      const accPayments = payments.filter((p) => p.accountId === acc.id);
      const accExpenses = expenses.filter((e) => e.accountId === acc.id);
      const accTransfersIn = transfers.filter((t) => t.toAccountId === acc.id);
      const accTransfersOut = transfers.filter((t) => t.fromAccountId === acc.id);
      const accRefunds = refunds.filter((r) => r.accountId === acc.id);

      const incomeSum = accPayments.reduce((s, p) => s + (p.amount || 0), 0);
      const expenseSum = accExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const transfersInSum = accTransfersIn.reduce((s, t) => s + (t.amount || 0), 0);
      const transfersOutSum = accTransfersOut.reduce((s, t) => s + (t.amount || 0), 0);
      const refundsSum = accRefunds.reduce((s, r) => s + (r.amount || 0), 0);

      const periodNet =
        incomeSum + transfersInSum - expenseSum - transfersOutSum - refundsSum;

      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        bankName: acc.bankName,
        currency: acc.currency,
        cityName: acc.city?.nameRu || null,
        managerResponsible: acc.managerResponsible || acc.user?.fullName || null,
        isManagerCash: acc.isManagerCash,
        currentBalance: acc.currentBalance,
        periodIncome: incomeSum,
        periodExpense: expenseSum,
        periodTransfersIn: transfersInSum,
        periodTransfersOut: transfersOutSum,
        periodRefunds: refundsSum,
        periodNet,
        paymentsCount: accPayments.length,
        expensesCount: accExpenses.length,
      };
    });

    // Currency totals for balances, period income, period expenses
    const balanceByCurrency: Record<string, number> = {};
    for (const acc of accounts) {
      balanceByCurrency[acc.currency] =
        (balanceByCurrency[acc.currency] || 0) + (acc.currentBalance || 0);
    }

    const periodIncomeByCurrency: Record<string, number> = {};
    for (const p of payments) {
      periodIncomeByCurrency[p.currency] =
        (periodIncomeByCurrency[p.currency] || 0) + (p.amount || 0);
    }

    const periodExpenseByCurrency: Record<string, number> = {};
    for (const e of expenses) {
      periodExpenseByCurrency[e.currency] =
        (periodExpenseByCurrency[e.currency] || 0) + (e.amount || 0);
    }

    return NextResponse.json({
      success: true,
      period: { startDate: startDateStr, endDate: endDateStr },
      issuedCars,
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        type: p.type,
        accountName: p.account?.name || null,
        managerName: p.managerName || null,
        bookingNumber: p.booking?.bookingNumber || "",
        carName: p.booking?.car
          ? `${p.booking.car.brand} ${p.booking.car.model} (${p.booking.car.plateNumber})`
          : "",
        customerName: p.booking?.customer?.fullName || "",
        createdAt: p.createdAt,
      })),
      expenses: expenses.map((e) => ({
        id: e.id,
        date: e.date,
        category: e.category,
        description: e.description,
        amount: e.amount,
        currency: e.currency,
        accountName: e.account?.name || "",
        managerName: e.managerName || "Не указан",
        carName: e.car ? `${e.car.brand} ${e.car.model} (${e.car.plateNumber})` : null,
        cityName: e.city?.nameRu || null,
        isOwnerExpense: e.isOwnerExpense,
      })),
      transfers: transfers.map((t) => ({
        id: t.id,
        date: t.date,
        fromAccountName: t.fromAccount?.name || "",
        toAccountName: t.toAccount?.name || "",
        amount: t.amount,
        currency: t.currency,
        senderName: t.senderName,
        recipientName: t.recipientName,
        notes: t.notes,
      })),
      refunds: refunds.map((r) => ({
        id: r.id,
        date: r.date,
        amount: r.amount,
        reason: r.reason,
        accountName: r.account?.name || r.method,
        managerName: r.managerName || "Не указан",
        bookingNumber: r.booking?.bookingNumber || "",
        customerName: r.booking?.customer?.fullName || "",
      })),
      accounts: accountBreakdown,
      totals: {
        issuedCount: issuedCars.length,
        totalRentalDays: issuedCars.reduce((s, c) => s + (c.rentalDays || 0), 0),
        balanceByCurrency,
        periodIncomeByCurrency,
        periodExpenseByCurrency,
      },
    });
  } catch (error: any) {
    console.error("Error generating daily finance report:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate report" },
      { status: 500 }
    );
  }
}
