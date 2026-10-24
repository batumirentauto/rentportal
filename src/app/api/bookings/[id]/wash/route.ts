import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { washStatus, cost = 0, notes } = body; // washStatus: "CLEAN", "WASHING", "NEEDS_WASH"

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
          cost: cost || 25,
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
          washType: "FULL",
          cost: cost || 25,
          notes: notes || "Создано менеджером перед выдачей",
        },
      });
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
