import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { washStatus, washType = "FULL", cost, notes, account = "CASH_BATUMI", managerName = "Менеджер смены" } = body; // washStatus: "CLEAN", "WASHING", "NEEDS_WASH"

    const finalCost = cost !== undefined
      ? Number(cost)
      : (washType === "FULL" ? 20 : washType === "BODY" || washType === "INTERIOR" ? 10 : 0);

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { car: true, washTasks: true },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Обновляем статус чистоты авто
    const updatedCar = await prisma.car.update({
      where: { id: booking.carId },
      data: {
        washStatus: washStatus,
        status: washStatus === "WASHING" ? "WASHING" : booking.car.status === "WASHING" ? "AVAILABLE" : booking.car.status,
      },
    });

    // Обновляем или создаем задачу на мойку
    if (booking.washTasks.length > 0) {
      await prisma.carWashTask.updateMany({
        where: { bookingId: id },
        data: {
          status: washStatus === "CLEAN" ? "COMPLETED" : washStatus === "WASHING" ? "IN_PROGRESS" : "PENDING",
          washType,
          cost: finalCost,
          notes: notes || undefined,
        },
      });
    } else if (washStatus !== "CLEAN") {
      await prisma.carWashTask.create({
        data: {
          carId: booking.carId,
          bookingId: id,
          status: washStatus === "WASHING" ? "IN_PROGRESS" : "PENDING",
          priority: "URGENT",
          washType,
          cost: finalCost,
          notes: notes || "Создано менеджером",
        },
      });
    }

    // Если мойка завершена ("CLEAN") и есть стоимость — создаем расход в Журнале расходов и списываем из кассы
    if (washStatus === "CLEAN" && finalCost > 0) {
      const typeLabel = washType === "FULL" ? "Полная мойка (20 ₾)" : washType === "BODY" ? "Мойка кузова (10 ₾)" : "Мойка салона (10 ₾)";
      let acc = null;
      if (managerName) {
        acc = await prisma.financialAccount.findFirst({
          where: { type: "CASH", managerResponsible: { contains: managerName.split(" ")[0] } },
        });
      }
      if (!acc && booking.car.cityId) {
        acc = await prisma.financialAccount.findFirst({
          where: { type: "CASH", cityId: booking.car.cityId },
        });
      }
      if (!acc) {
        acc = await prisma.financialAccount.findFirst({ where: { currency: "GEL", type: "CASH" } }) || await prisma.financialAccount.findFirst();
      }

      if (acc) {
        await prisma.expense.create({
          data: {
            accountId: acc.id,
            category: "WASHING",
            amount: finalCost,
            currency: "GEL",
            carId: booking.carId,
            cityId: booking.car.cityId,
            managerName,
            description: `Оплата мойки авто: ${typeLabel} — ${booking.car.brand} ${booking.car.model} (${booking.car.plateNumber})`,
            date: new Date(),
          },
        });

        // Списываем средства с баланса кассы менеджера
        await prisma.financialAccount.update({
          where: { id: acc.id },
          data: { currentBalance: { decrement: finalCost } },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Статус мойки обновлен на ${washStatus}`,
      car: updatedCar,
    });
  } catch (error) {
    console.error("Error updating car wash status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update wash status" },
      { status: 500 }
    );
  }
}
