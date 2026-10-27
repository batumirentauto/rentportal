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

    const expense = await prisma.expense.create({
      data: {
        accountId,
        category,
        amount: Number(amount),
        currency,
        description,
        cityId: cityId || undefined,
        carId: carId || undefined,
        managerName,
        status,
        isMonthlySettled,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        account: true,
      },
    });

    // Списываем средства с баланса кассы / счёта ТОЛЬКО если статус PAID (не начисление)
    if (status === "PAID") {
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
