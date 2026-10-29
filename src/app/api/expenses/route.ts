import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerAsyncFinancialSheetsSync } from "@/lib/financial-sheets-sync";

export async function GET() {
  try {
    const expenses = await prisma.expense.findMany({
      include: {
        account: true,
        city: true,
        car: true,
        owner: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, expenses });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      accountId,
      category,
      amount,
      currency = "GEL",
      description,
      cityId,
      carId,
      ownerId,
      paymentMethod = "BANK_TRANSFER",
      managerName = "Менеджер",
      date,
      status: requestedStatus,
      isMonthlySettled: requestedIsMonthlySettled,
    } = body;

    // Мойка по умолчанию считается начислением к ежемесячной оплате партнеру-мойке (не списание с рук)
    const isWashingAccrual = category === "WASHING" && requestedStatus !== "PAID";
    const status = requestedStatus || (isWashingAccrual ? "ACCRUED" : "PAID");
    const isMonthlySettled = requestedIsMonthlySettled !== undefined 
      ? Boolean(requestedIsMonthlySettled) 
      : (status !== "ACCRUED");

    // Если расход привязан к авто инвестора — автоматически связываем с владельцем
    let resolvedOwnerId = ownerId || undefined;
    let isOwnerExpense = Boolean(body.isOwnerExpense);
    if (carId) {
      const car = await prisma.car.findUnique({
        where: { id: carId },
        select: { ownerId: true },
      });
      if (car?.ownerId) {
        resolvedOwnerId = resolvedOwnerId || car.ownerId;
        isOwnerExpense = true;
      }
    }
    if (resolvedOwnerId && category !== "OWNER_PAYOUT") {
      isOwnerExpense = true;
    }

    const expense = await prisma.expense.create({
      data: {
        accountId,
        category,
        amount: Number(amount),
        currency,
        description,
        cityId: cityId || undefined,
        carId: carId || undefined,
        ownerId: resolvedOwnerId,
        isOwnerExpense,
        managerName,
        status,
        isMonthlySettled,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        account: true,
        owner: true,
        car: true,
      },
    });

    // Если это выплата инвестору (владельцу авто) — фиксируем в реестре выплат инвесторам
    if (category === "OWNER_PAYOUT" && ownerId) {
      await prisma.ownerPayout.create({
        data: {
          ownerId,
          amount: Number(amount),
          currency,
          status: "PAID",
          paymentMethod,
          notes: description || `Выплата инвестору из журнала расходов (${managerName})`,
        },
      }).catch((e) => console.warn("Notice: could not create OwnerPayout from expense:", e));
    }

    // Списываем средства с баланса кассы / счёта ТОЛЬКО если статус PAID (не начисление)
    if (status === "PAID" && accountId) {
      await prisma.financialAccount.update({
        where: { id: accountId },
        data: {
          currentBalance: {
            decrement: Number(amount),
          },
        },
      });
    }

    // Auto-sync financial data to Google Sheets backup
    triggerAsyncFinancialSheetsSync();

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json({ success: false, error: "Failed to create expense" }, { status: 500 });
  }
}
