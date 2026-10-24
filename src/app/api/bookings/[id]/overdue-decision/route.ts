import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await props.params;
    const body = await request.json();
    const { decision, notes } = body; // decision: "CANCEL" | "KEEP"

    if (!["CANCEL", "KEEP"].includes(decision)) {
      return NextResponse.json(
        { success: false, error: "Некорректное решение. Допустимо: CANCEL или KEEP" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        car: true,
        customer: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Бронирование не найдено" },
        { status: 404 }
      );
    }

    if (decision === "CANCEL") {
      // 1. Снимаем бронь с автомобиля
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED",
          overdueDecision: "CANCELLED",
          overdueDecisionAt: new Date(),
          overdueDecisionNotes:
            notes || "Бронь снята менеджером по причине неявки клиента через 3+ часа после времени выдачи.",
        },
      });

      // 2. Освобождаем автомобиль, если он не на СТОПе
      let carStatus = "AVAILABLE";
      if (booking.car.isStopBlocked) {
        carStatus = "MAINTENANCE_BLOCKED";
      }

      await prisma.car.update({
        where: { id: booking.carId },
        data: {
          status: carStatus,
        },
      });

      return NextResponse.json({
        success: true,
        decision: "CANCEL",
        message: `Бронь № ${booking.bookingNumber} снята с автомобиля. ${booking.car.brand} ${booking.car.model} (${booking.car.plateNumber}) освобожден и снова доступен для других клиентов!`,
        booking: updatedBooking,
        freedCar: {
          id: booking.car.id,
          brand: booking.car.brand,
          model: booking.car.model,
          plateNumber: booking.car.plateNumber,
          status: carStatus,
        },
      });
    } else {
      // Оставляем бронь за клиентом
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          overdueDecision: "KEPT",
          overdueDecisionAt: new Date(),
          overdueDecisionNotes:
            notes || "Бронь сохранена за клиентом. Клиент задерживается и подтвердил приезд.",
        },
      });

      return NextResponse.json({
        success: true,
        decision: "KEEP",
        message: `Бронь № ${booking.bookingNumber} сохранена за клиентом ${booking.customer.fullName}. Автомобиль остается забронирован.`,
        booking: updatedBooking,
      });
    }
  } catch (error) {
    console.error("Error processing overdue booking decision:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка при обработке решения по бронированию" },
      { status: 500 }
    );
  }
}
