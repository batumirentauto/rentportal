import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const drivers = await prisma.additionalDriver.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, drivers });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Ошибка получения водителей: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      fullName,
      licenseNumber,
      phone,
      birthDate,
      licensePhotoUrl,
      licenseBackPhotoUrl,
      notes,
    } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { success: false, error: "ФИО дополнительного водителя обязательно" },
        { status: 400 }
      );
    }

    // Проверяем лимит: не более 4-х доп. водителей
    const currentCount = await prisma.additionalDriver.count({
      where: { bookingId: id },
    });

    if (currentCount >= 4) {
      return NextResponse.json(
        { success: false, error: "Достигнут лимит: максимум 4 дополнительных водителя" },
        { status: 400 }
      );
    }

    const driver = await prisma.additionalDriver.create({
      data: {
        bookingId: id,
        fullName: fullName.trim(),
        licenseNumber: licenseNumber?.trim() || null,
        phone: phone?.trim() || null,
        birthDate: birthDate?.trim() || null,
        licensePhotoUrl: licensePhotoUrl || null,
        licenseBackPhotoUrl: licenseBackPhotoUrl || null,
        notes: notes?.trim() || null,
      },
    });

    const drivers = await prisma.additionalDriver.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      message: `Водитель ${driver.fullName} успешно добавлен`,
      driver,
      drivers,
    });
  } catch (error: any) {
    console.error("Error creating additional driver:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка при добавлении водителя: " + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driverId");

    if (!driverId) {
      return NextResponse.json(
        { success: false, error: "ID водителя не указан" },
        { status: 400 }
      );
    }

    await prisma.additionalDriver.delete({
      where: { id: driverId, bookingId: id },
    });

    const drivers = await prisma.additionalDriver.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      message: "Дополнительный водитель удален",
      drivers,
    });
  } catch (error: any) {
    console.error("Error deleting additional driver:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка удаления водителя: " + error.message },
      { status: 500 }
    );
  }
}
