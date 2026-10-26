import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      amount,
      reason,
      notes,
      method = "CASH",
      accountId,
      managerName = "Менеджер смены",
      adjustBookingTotal = true,
    } = body;

    const refundAmount = Number(amount);
    if (!refundAmount || refundAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Укажите корректную сумму возврата" },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: "Укажите причину возврата" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        car: { include: { city: true } },
        customer: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Бронирование не найдено" },
        { status: 404 }
      );
    }

    // 1. Создаем запись возврата BookingRefund
    const refund = await prisma.bookingRefund.create({
      data: {
        bookingId: id,
        amount: refundAmount,
        reason: reason.trim(),
        notes: notes?.trim() || null,
        method,
        accountId: accountId || null,
        managerName,
        date: new Date(),
      },
      include: {
        account: true,
      },
    });

    // 2. Создаем проводку в платежах
    await prisma.payment.create({
      data: {
        bookingId: id,
        type: "REFUND",
        amount: -refundAmount,
        currency: booking.currency || "GEL",
        method,
        status: "REFUNDED",
        accountId: accountId || null,
        managerName,
        notes: `Возврат средств клиенту: ${reason}${notes ? ` — ${notes}` : ""}`,
      },
    });

    // 3. Создаем расход компании Expense (CLIENT_REFUND) и списываем с кассы, если указан счет
    if (accountId) {
      await prisma.expense.create({
        data: {
          accountId,
          category: "CLIENT_REFUND",
          amount: refundAmount,
          currency: booking.currency || "GEL",
          description: `Возврат клиенту ${booking.customer.fullName} по брони № ${booking.bookingNumber}: ${reason}${notes ? ` (${notes})` : ""}`,
          cityId: booking.car?.cityId || undefined,
          carId: booking.carId,
          managerName,
          status: "PAID",
          isMonthlySettled: true,
          date: new Date(),
        },
      });

      // Списываем средства с баланса кассы
      await prisma.financialAccount.update({
        where: { id: accountId },
        data: {
          currentBalance: {
            decrement: refundAmount,
          },
        },
      });
    }

    // 4. Корректировка общей суммы аренды (если выбрано)
    if (adjustBookingTotal) {
      const newTotal = Math.max(0, booking.totalAmount - refundAmount);
      await prisma.booking.update({
        where: { id },
        data: {
          totalAmount: newTotal,
        },
      });
    }

    const updatedBooking = await prisma.booking.findUnique({
      where: { id },
      include: {
        car: { include: { city: true } },
        customer: true,
        pickupLocation: { include: { city: true } },
        returnLocation: { include: { city: true } },
        extras: true,
        washTasks: true,
        handoverReport: true,
        returnReport: true,
        trafficFines: true,
        payments: true,
        additionalDrivers: true,
        refunds: { include: { account: true } },
        extensions: { include: { account: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Возврат ${refundAmount} ₾ клиенту успешно зафиксирован`,
      refund,
      booking: updatedBooking,
    });
  } catch (error: any) {
    console.error("Error creating refund:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка при оформлении возврата: " + error.message },
      { status: 500 }
    );
  }
}
