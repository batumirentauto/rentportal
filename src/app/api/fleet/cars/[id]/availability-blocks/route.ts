import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blocks = await prisma.carAvailabilityBlock.findMany({
      where: { carId: id },
      orderBy: { startDate: "desc" },
    });
    return NextResponse.json({ success: true, blocks });
  } catch (error: any) {
    console.error("Error fetching availability blocks:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки блокировок" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const car = await prisma.car.findUnique({
      where: { id },
      include: { city: true },
    });

    if (!car) {
      return NextResponse.json({ success: false, error: "Автомобиль не найден" }, { status: 404 });
    }

    const { startDate, endDate, reason, reasonText, notes, createdBy } = body;

    // Дата начала: либо переданная, либо сегодня 00:00
    let parsedStart: Date;
    if (startDate) {
      parsedStart = new Date(startDate);
      // Устанавливаем начало дня
      if (typeof startDate === "string" && startDate.length === 10) {
        parsedStart.setHours(0, 0, 0, 0);
      }
    } else {
      parsedStart = new Date();
      parsedStart.setHours(0, 0, 0, 0);
    }

    // Дата окончания: если не передана или пустая строка — бессрочно (null)
    let parsedEnd: Date | null = null;
    if (endDate && String(endDate).trim() !== "") {
      parsedEnd = new Date(endDate);
      if (typeof endDate === "string" && endDate.length === 10) {
        parsedEnd.setHours(23, 59, 59, 999);
      }
    }

    // Создаем запись блокировки
    const block = await prisma.carAvailabilityBlock.create({
      data: {
        carId: id,
        startDate: parsedStart,
        endDate: parsedEnd,
        reason: reason || "MAINTENANCE",
        reasonText: reasonText || null,
        notes: notes || null,
        createdBy: createdBy || "Менеджер",
        isActive: true,
      },
    });

    const now = new Date();
    // Если блокировка актуальна на данный момент (началась сегодня/ранее и еще не закончилась)
    const isCurrentlyActive = parsedStart <= now && (!parsedEnd || parsedEnd >= now);

    if (isCurrentlyActive) {
      const displayReason = reasonText || reason || "Ручная блокировка доступности";
      await prisma.car.update({
        where: { id },
        data: {
          isStopBlocked: true,
          stopReason: displayReason,
          stopBlockedAt: now,
          stopNotes: notes || null,
          status: reason === "MAINTENANCE" || reason === "REPAIR" ? "MAINTENANCE" : "BLOCKED",
        },
      });
    }

    const periodStr = parsedEnd
      ? `с ${parsedStart.toLocaleDateString("ru-RU")} по ${parsedEnd.toLocaleDateString("ru-RU")}`
      : `с ${parsedStart.toLocaleDateString("ru-RU")} бессрочно (до ручного открытия)`;

    return NextResponse.json({
      success: true,
      block,
      message: `Доступность автомобиля ${car.brand} ${car.model} закрыта ${periodStr}.`,
    });
  } catch (error: any) {
    console.error("Error creating availability block:", error);
    return NextResponse.json({ success: false, error: "Ошибка создания блокировки: " + error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get("blockId");

    if (!blockId) {
      return NextResponse.json({ success: false, error: "blockId обязателен" }, { status: 400 });
    }

    // Деактивируем или удаляем блокировку
    await prisma.carAvailabilityBlock.update({
      where: { id: blockId },
      data: { isActive: false },
    });

    // Проверяем, остались ли другие активные блокировки
    const remainingActiveBlocks = await prisma.carAvailabilityBlock.findMany({
      where: {
        carId: id,
        isActive: true,
      },
    });

    const now = new Date();
    const hasCurrentBlock = remainingActiveBlocks.some(
      (b) => b.startDate <= now && (!b.endDate || b.endDate >= now)
    );

    if (!hasCurrentBlock) {
      // Снимаем автомобиль со СТОПа
      await prisma.car.update({
        where: { id },
        data: {
          isStopBlocked: false,
          stopReason: null,
          stopNotes: null,
          status: "AVAILABLE",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Блокировка снята. Доступность автомобиля восстановлена!",
    });
  } catch (error: any) {
    console.error("Error deleting availability block:", error);
    return NextResponse.json({ success: false, error: "Ошибка снятия блокировки: " + error.message }, { status: 500 });
  }
}
