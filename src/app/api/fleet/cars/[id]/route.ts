import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerAsyncFinancialSheetsSync } from "@/lib/financial-sheets-sync";

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
    } else if (body.cityCode) {
      const targetCity = await prisma.city.findUnique({ where: { code: body.cityCode } });
      if (targetCity) {
        updateData.cityId = targetCity.id;
      }
    }

    // 2. Статус авто
    if (body.status !== undefined) updateData.status = body.status;

    // 3. Пробег и топливо
    if (body.currentMileage !== undefined) updateData.currentMileage = Number(body.currentMileage);
    if (body.currentFuelPerc !== undefined) updateData.currentFuelPerc = Number(body.currentFuelPerc);
    if (body.tankVolumeLiters !== undefined) updateData.tankVolumeLiters = Number(body.tankVolumeLiters);
    if (body.fuelType !== undefined) updateData.fuelType = body.fuelType;

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

    // 9. Государственный техосмотр (PTI) и фото
    if (body.inspectionPhotoUrl !== undefined) updateData.inspectionPhotoUrl = body.inspectionPhotoUrl || null;
    if (body.inspectionNumber !== undefined) updateData.inspectionNumber = body.inspectionNumber || null;
    if (body.inspectionDate !== undefined) updateData.inspectionDate = body.inspectionDate ? new Date(body.inspectionDate) : null;
    if (body.inspectionExpiryDate !== undefined) {
      updateData.inspectionExpiryDate = body.inspectionExpiryDate ? new Date(body.inspectionExpiryDate) : null;
      if (updateData.inspectionExpiryDate && updateData.inspectionExpiryDate > new Date()) {
        updateData.inspectionStatus = "VALID";
      }
    }
    if (body.inspectionStatus !== undefined) updateData.inspectionStatus = body.inspectionStatus;

    // 10. Страхование и техпаспорт
    if (body.insurancePolicyPhotoUrl !== undefined) updateData.insurancePolicyPhotoUrl = body.insurancePolicyPhotoUrl || null;
    if (body.techPassportFrontUrl !== undefined) updateData.techPassportFrontUrl = body.techPassportFrontUrl || null;
    if (body.techPassportBackUrl !== undefined) updateData.techPassportBackUrl = body.techPassportBackUrl || null;
    if (body.techPassportNumber !== undefined) updateData.techPassportNumber = body.techPassportNumber || null;

    // 10.5. Фотографии автомобиля и товарные карточки
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl || null;
    if (body.cardBannerUrl !== undefined) updateData.cardBannerUrl = body.cardBannerUrl || null;

    // 11. Паспортные реквизиты ТС (VIN, год, госномер)
    if (body.vin !== undefined && body.vin) updateData.vin = body.vin.toUpperCase().trim();
    if (body.year !== undefined && !isNaN(Number(body.year))) updateData.year = Number(body.year);
    if (body.plateNumber !== undefined && body.plateNumber) updateData.plateNumber = body.plateNumber.toUpperCase().trim();
    if (body.brand !== undefined && body.brand) {
      let b = String(body.brand).trim();
      if (b.length > 3 && b === b.toUpperCase()) {
        b = b.charAt(0).toUpperCase() + b.slice(1).toLowerCase();
      }
      updateData.brand = b;
    }
    if (body.model !== undefined && body.model) updateData.model = body.model.trim();
    if (body.color !== undefined && body.color) updateData.color = body.color.trim();

    // 12. Вывод из автопарка / Архив / Деактивация (быстрое удаление из шахматки с сохранением истории)
    if (body.isArchived !== undefined) {
      updateData.isArchived = Boolean(body.isArchived);
      if (updateData.isArchived) {
        updateData.archivedAt = new Date();
        updateData.status = "ARCHIVED";
        if (body.archiveReason) updateData.archiveReason = body.archiveReason;
        if (body.archiveNotes !== undefined) updateData.archiveNotes = body.archiveNotes;
      } else {
        // Восстановление автомобиля в автопарк
        updateData.archivedAt = null;
        updateData.archiveReason = null;
        updateData.archiveNotes = null;
        updateData.status = "AVAILABLE";
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

    // Auto-sync fleet & financial indicators to Google Sheets backup
    triggerAsyncFinancialSheetsSync();

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

// Быстрое оперативное удаление (вывод) автомобиля из шахматки с сохранением истории и показателей
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get("reason") || "DECOMMISSIONED";
    const notes = searchParams.get("notes") || "Выведен из автопарка";

    const car = await prisma.car.findUnique({ where: { id } });
    if (!car) {
      return NextResponse.json({ success: false, error: "Автомобиль не найден" }, { status: 404 });
    }

    // Soft delete: сохраняем все связанные брони, расходы, пробеги и штрафы,
    // но удаляем автомобиль из активной шахматки и подбора
    const archivedCar = await prisma.car.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archiveReason: reason,
        archiveNotes: notes,
        status: "ARCHIVED",
      },
      include: {
        city: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Автомобиль ${car.brand} ${car.model} (${car.plateNumber}) успешно выведен из автопарка и удален из шахматки. Все показатели сохранены.`,
      car: archivedCar,
    });
  } catch (error: any) {
    console.error("Error archiving car:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
