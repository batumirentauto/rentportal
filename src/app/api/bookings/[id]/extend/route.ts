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
      type = "DAYS", // "DAYS" | "HOURS"
      extraDays = 0,
      extraHours = 0,
      newEndDate: customNewEndDate,
      dailyRate,
      amount,
      paymentTiming = "ON_RETURN", // "IMMEDIATE" | "ON_RETURN"
      paymentMethod = "BANK_TRANSFER", // "BANK_TRANSFER" | "CASH" | "CRYPTO" | "CARD"
      accountId,
      managerName = "Менеджер смены",
      notes,
    } = body;

    const extensionAmount = Number(amount) || 0;
    const daysToAdd = Number(extraDays) || 0;
    const hoursToAdd = Number(extraHours) || 0;

    if (daysToAdd <= 0 && hoursToAdd <= 0 && !customNewEndDate) {
      return NextResponse.json(
        { success: false, error: "Укажите количество дней или часов для продления" },
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

    const previousEndDate = new Date(booking.endDate);
    let calculatedNewEndDate = new Date(previousEndDate);

    if (customNewEndDate) {
      calculatedNewEndDate = new Date(customNewEndDate);
    } else if (type === "DAYS" && daysToAdd > 0) {
      calculatedNewEndDate = new Date(previousEndDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    } else if (type === "HOURS" && hoursToAdd > 0) {
      calculatedNewEndDate = new Date(previousEndDate.getTime() + hoursToAdd * 60 * 60 * 1000);
    }

    // 1. Создаем запись о продлении
    const extension = await prisma.bookingExtension.create({
      data: {
        bookingId: id,
        type,
        extraDays: daysToAdd,
        extraHours: hoursToAdd,
        previousEndDate,
        newEndDate: calculatedNewEndDate,
        dailyRate: dailyRate ? Number(dailyRate) : booking.dailyRate,
        amount: extensionAmount,
        paymentTiming,
        paymentMethod: paymentTiming === "IMMEDIATE" ? paymentMethod : null,
        paymentStatus: paymentTiming === "IMMEDIATE" ? "PAID" : "PENDING",
        accountId: paymentTiming === "IMMEDIATE" ? accountId || null : null,
        managerName,
        notes: notes?.trim() || null,
      },
      include: {
        account: true,
      },
    });

    // 2. Если оплата в момент продления (сейчас)
    if (paymentTiming === "IMMEDIATE" && extensionAmount > 0) {
      await prisma.payment.create({
        data: {
          bookingId: id,
          type: "RENTAL",
          amount: extensionAmount,
          currency: booking.currency || "GEL",
          method: paymentMethod || "CASH",
          status: "PAID",
          accountId: accountId || null,
          managerName,
          notes: `Оплата продления аренды (${type === "DAYS" ? `+${daysToAdd} дн.` : `+${hoursToAdd} ч.`}) — ${notes || "по согласованию"}`,
        },
      });

      // Пополняем баланс кассы/счета компании, если указан
      if (accountId) {
        await prisma.financialAccount.update({
          where: { id: accountId },
          data: {
            currentBalance: {
              increment: extensionAmount,
            },
          },
        });
      }
    }

    // 3. Обновляем само бронирование
    // Часовое продление (до 7 часов) на сумму владельца автомобиля никак не влияет —
    // эта сумма идёт на 100% в кассу проката.
    // Если продление посуточное (или более 7 часов = 1 сутки), владельцу начисляется его суточная ставка.
    const additionalDays = daysToAdd > 0 ? daysToAdd : hoursToAdd > 7 ? 1 : 0;
    const additionalOwnerPayout = additionalDays * (booking.ownerDailyRate || 0);
    const isHours = type === "HOURS" || hoursToAdd > 0;

    await prisma.booking.update({
      where: { id },
      data: {
        endDate: calculatedNewEndDate,
        rentalDays: booking.rentalDays + additionalDays,
        totalAmount: booking.totalAmount + extensionAmount,
        rentalTotal: booking.rentalTotal + extensionAmount,
        ownerTotalPayout: (booking.ownerTotalPayout || 0) + additionalOwnerPayout,
        ...(dailyRate && { dailyRate: Number(dailyRate) }),
        ...(isHours && {
          extraHoursCount: (booking.extraHoursCount || 0) + hoursToAdd,
          extraHoursFee: (booking.extraHoursFee || 0) + extensionAmount,
          isExtraHoursPaid: paymentTiming === "IMMEDIATE",
        }),
      },
    });

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
      message: `Бронь № ${booking.bookingNumber} успешно продлена до ${calculatedNewEndDate.toLocaleDateString("ru-RU")} ${calculatedNewEndDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} (+${extensionAmount} ₾)`,
      extension,
      booking: updatedBooking,
    });
  } catch (error: any) {
    console.error("Error extending booking:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка при продлении аренды: " + error.message },
      { status: 500 }
    );
  }
}
