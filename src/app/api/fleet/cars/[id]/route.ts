import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const car = await prisma.car.findUnique({
      where: { id },
      include: {
        city: true,
        owner: true,
        availabilityBlocks: {
          orderBy: { startDate: "desc" },
        },
        bookings: {
          where: {
            status: { notIn: ["CANCELLED"] },
          },
          include: {
            customer: true,
            pickupLocation: { include: { city: true } },
            returnLocation: { include: { city: true } },
          },
          orderBy: { startDate: "asc" },
          take: 10,
        },
      },
    });

    if (!car) {
      return NextResponse.json({ success: false, error: "Автомобиль не найден" }, { status: 404 });
    }

    const cities = await prisma.city.findMany({ orderBy: { nameRu: "asc" } });
    const owners = await prisma.carOwner.findMany({ orderBy: { fullName: "asc" } });

    return NextResponse.json({ success: true, car, cities, owners });
  } catch (error: any) {
    console.error("Error fetching car:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки карточки автомобиля" }, { status: 500 });
  }
}

export async function PATCH(
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

    const updateData: any = {};

    // 1. Принудительная смена города присутствия (дислокации)
    if (body.cityId !== undefined && body.cityId !== car.cityId) {
      updateData.cityId = body.cityId;
    }

    // 2. Статус авто
    if (body.status !== undefined) updateData.status = body.status;

    // 3. Пробег и топливо
    if (body.currentMileage !== undefined) updateData.currentMileage = Number(body.currentMileage);
    if (body.currentFuelPerc !== undefined) updateData.currentFuelPerc = Number(body.currentFuelPerc);

    // 4. Тарифная сетка и заметки
    if (body.clientMinDailyRate !== undefined) updateData.clientMinDailyRate = Number(body.clientMinDailyRate);
    if (body.clientStandardDailyRate !== undefined) updateData.clientStandardDailyRate = Number(body.clientStandardDailyRate);
    if (body.clientMaxDailyRate !== undefined) updateData.clientMaxDailyRate = Number(body.clientMaxDailyRate);
    if (body.pricingNotes !== undefined) updateData.pricingNotes = body.pricingNotes;

    // 5. Владелец
    if (body.ownerId !== undefined) updateData.ownerId = body.ownerId || null;
    if (body.defaultOwnerDailyRate !== undefined) updateData.defaultOwnerDailyRate = Number(body.defaultOwnerDailyRate);

    // 6. Парковка Батуми
    if (body.hasBatumiParking !== undefined) updateData.hasBatumiParking = Boolean(body.hasBatumiParking);
    if (body.batumiParkingPermitNumber !== undefined) updateData.batumiParkingPermitNumber = body.batumiParkingPermitNumber;
    if (body.batumiParkingExpiresAt !== undefined) {
      updateData.batumiParkingExpiresAt = body.batumiParkingExpiresAt ? new Date(body.batumiParkingExpiresAt) : null;
    }
    if (body.batumiParkingCost !== undefined) updateData.batumiParkingCost = Number(body.batumiParkingCost);

    // 7. GPS трекер
    if (body.hasGpsTracker !== undefined) updateData.hasGpsTracker = Boolean(body.hasGpsTracker);
    if (body.gpsMonthlyFee !== undefined) updateData.gpsMonthlyFee = Number(body.gpsMonthlyFee);
    if (body.isGpsFeeChargedToOwner !== undefined) updateData.isGpsFeeChargedToOwner = Boolean(body.isGpsFeeChargedToOwner);

    // 8. СТОП / Блокировка
    if (body.isStopBlocked !== undefined) {
      updateData.isStopBlocked = Boolean(body.isStopBlocked);
      if (updateData.isStopBlocked) {
        updateData.stopBlockedAt = new Date();
        if (body.stopReason) updateData.stopReason = body.stopReason;
        if (body.stopNotes) updateData.stopNotes = body.stopNotes;
      } else {
        updateData.stopReason = null;
        updateData.stopNotes = null;
      }
    }

    const updatedCar = await prisma.car.update({
      where: { id },
      data: updateData,
      include: {
        city: true,
        owner: true,
        availabilityBlocks: {
          where: { isActive: true },
          orderBy: { startDate: "asc" },
        },
      },
    });

    // Если был сменен город, сформируем информативное сообщение
    let message = "Параметры автомобиля успешно сохранены!";
    if (body.cityId && body.cityId !== car.cityId) {
      message = `Город присутствия автомобиля ${updatedCar.brand} ${updatedCar.model} изменен на: ${updatedCar.city.nameRu}!`;
    }

    return NextResponse.json({
      success: true,
      car: updatedCar,
      message,
    });
  } catch (error: any) {
    console.error("Error updating car:", error);
    return NextResponse.json({ success: false, error: "Ошибка обновления автомобиля: " + error.message }, { status: 500 });
  }
}
