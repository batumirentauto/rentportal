import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await connection();
  try {
    const transfers = await prisma.cashTransfer.findMany({
      include: {
        fromAccount: {
          select: { id: true, name: true, type: true, managerResponsible: true, currency: true },
        },
        toAccount: {
          select: { id: true, name: true, type: true, managerResponsible: true, currency: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      transfers,
    });
  } catch (error: any) {
    console.error("GET /api/finance/transfers error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch transfers" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const body = await req.json();
    const { fromAccountId, toAccountId, amount, notes, senderName, recipientName } = body;

    if (!fromAccountId || !toAccountId || !amount) {
      return NextResponse.json(
        { success: false, error: "Укажите кассу отправителя, кассу получателя и сумму" },
        { status: 400 }
      );
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json(
        { success: false, error: "Касса отправителя и касса получателя не могут совпадать" },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Сумма перевода должна быть больше нуля" },
        { status: 400 }
      );
    }

    const fromAcc = await prisma.financialAccount.findUnique({ where: { id: fromAccountId } });
    const toAcc = await prisma.financialAccount.findUnique({ where: { id: toAccountId } });

    if (!fromAcc || !toAcc) {
      return NextResponse.json(
        { success: false, error: "Касса отправителя или счёт получателя не найдены" },
        { status: 404 }
      );
    }

    // 1. Списание с кассы отправителя
    await prisma.financialAccount.update({
      where: { id: fromAccountId },
      data: { currentBalance: { decrement: numAmount } },
    });

    // 2. Зачисление в кассу получателя
    await prisma.financialAccount.update({
      where: { id: toAccountId },
      data: { currentBalance: { increment: numAmount } },
    });

    const finalSender = (senderName || fromAcc.managerResponsible || fromAcc.name).trim();
    const finalRecipient = (recipientName || toAcc.managerResponsible || toAcc.name).trim();

    // 3. Создание проводки перевода в CashTransfer
    const transfer = await prisma.cashTransfer.create({
      data: {
        fromAccountId,
        toAccountId,
        amount: numAmount,
        currency: fromAcc.currency || "GEL",
        senderName: finalSender,
        recipientName: finalRecipient,
        notes: notes ? notes.trim() : `Перенос средств: ${finalSender} ➔ ${finalRecipient}`,
      },
    });

    // 4. Запись расхода-инкассации в Expense кассы отправителя для отображения в смене
    await prisma.expense.create({
      data: {
        accountId: fromAccountId,
        category: "TRANSFER",
        amount: numAmount,
        currency: fromAcc.currency || "GEL",
        description: `Передача кассы: передано «${toAcc.name}» (${notes || "перенос средств"})`,
        cityId: fromAcc.cityId || undefined,
        managerName: finalSender,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Успешно переведено ${numAmount} ₾ из «${fromAcc.name}» в «${toAcc.name}»`,
      transfer,
    });
  } catch (error: any) {
    console.error("POST /api/finance/transfers error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process transfer" },
      { status: 500 }
    );
  }
}
