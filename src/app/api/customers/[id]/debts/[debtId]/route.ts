import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/customers/[id]/debts/[debtId] - Погашение (частичное или полное) долга
export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string; debtId: string }> }
) {
  try {
    const { id: customerId, debtId } = await props.params;
    const body = await request.json();

    const {
      paymentAmount,
      paymentMethod = "CASH", // "CASH" | "CARD_POS" | "TBC_BANK" | "BOG_BANK" | "CRYPTO"
      managerName = "Менеджер смены",
      notes = "",
    } = body;

    const debt = await prisma.customerDebt.findUnique({
      where: { id: debtId },
      include: {
        customer: true,
      },
    });

    if (!debt || debt.customerId !== customerId) {
      return NextResponse.json(
        { success: false, error: "Запись о долге не найдена" },
        { status: 404 }
      );
    }

    const payValue = Number(paymentAmount);
    if (!payValue || payValue <= 0) {
      return NextResponse.json(
        { success: false, error: "Укажите корректную сумму платежа" },
        { status: 400 }
      );
    }

    const currentPaid = Number(debt.paidAmount || 0);
    const newPaid = currentPaid + payValue;
    const isFullyPaid = newPaid >= debt.amount;
    const newStatus = isFullyPaid ? "PAID" : "PARTIALLY_PAID";
    const now = new Date();

    const updatedDebt = await prisma.customerDebt.update({
      where: { id: debtId },
      data: {
        paidAmount: newPaid,
        status: newStatus,
        resolvedAt: isFullyPaid ? now : null,
        notes: notes ? `${debt.notes ? debt.notes + "\n" : ""}[${now.toLocaleDateString("ru-RU")}] Оплата ${payValue} ₾ (${paymentMethod}, ${managerName}): ${notes}` : debt.notes,
      },
    });

    // Если долг привязан к бронированию, фиксируем Payment в системе учета компании
    if (debt.bookingId) {
      await prisma.payment.create({
        data: {
          bookingId: debt.bookingId,
          type: "RENTAL",
          amount: payValue,
          currency: debt.currency || "GEL",
          method: paymentMethod,
          status: "PAID",
          managerName,
          notes: `Погашение долга клиента (${debt.category}): ${payValue} ₾ из ${debt.amount} ₾. Клиент: ${debt.customer.fullName}. ${notes || ""}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      debt: updatedDebt,
      message: isFullyPaid
        ? `Долг в размере ${debt.amount} ₾ полностью закрыт!`
        : `Платеж ${payValue} ₾ принят. Оставшийся долг: ${debt.amount - newPaid} ₾`,
    });
  } catch (error) {
    console.error("PATCH /api/customers/[id]/debts/[debtId] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record debt payment" },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id]/debts/[debtId] - Списание / аннулирование долга
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string; debtId: string }> }
) {
  try {
    const { id: customerId, debtId } = await props.params;

    const debt = await prisma.customerDebt.findUnique({
      where: { id: debtId },
    });

    if (!debt || debt.customerId !== customerId) {
      return NextResponse.json(
        { success: false, error: "Запись о долге не найдена" },
        { status: 404 }
      );
    }

    const updated = await prisma.customerDebt.update({
      where: { id: debtId },
      data: {
        status: "CANCELLED",
        resolvedAt: new Date(),
        notes: `${debt.notes ? debt.notes + "\n" : ""}[${new Date().toLocaleDateString("ru-RU")}] Долг списан / аннулирован`,
      },
    });

    return NextResponse.json({
      success: true,
      debt: updated,
      message: "Долг успешно списан",
    });
  } catch (error) {
    console.error("DELETE /api/customers/[id]/debts/[debtId] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel debt" },
      { status: 500 }
    );
  }
}
