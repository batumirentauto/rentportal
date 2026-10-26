import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const swapDateParam = searchParams.get("swapDate");

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        car: {
          include: {
            city: true,
            owner: true,
          },
        },
        customer: true,
        pickupLocation: { include: { city: true } },
        returnLocation: { include: { city: true } },
        swapsFrom: {
          include: {
            oldCar: true,
            newCar: true,
            newBooking: true,
          },
        },
        swapsTo: {
          include: {
            oldCar: true,
            newCar: true,
            booking: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Бронирование не найдено" },
        { status: 404 }
      );
    }

    const swapDate = swapDateParam ? new Date(swapDateParam) : new Date();
    const endDate = new Date(booking.endDate);

    // Ищем все автомобили, которые не на СТОПе и не в архиве
    const allCars = await prisma.car.findMany({
      where: {
        isArchived: false,
        id: { not: booking.carId }, // кроме текущей машины
      },
      include: {
        city: true,
        owner: true,
        bookings: {
          where: {
            status: { in: ["ACTIVE", "CONFIRMED"] },
            startDate: { lt: endDate },
            endDate: { gt: swapDate },
          },
        },
        availabilityBlocks: {
          where: {
            startDate: { lt: endDate },
            OR: [
              { endDate: null },
              { endDate: { gt: swapDate } },
            ],
          },
        },
      },
      orderBy: [
        { city: { nameRu: "asc" } },
        { brand: "asc" },
      ],
    });

    // Фильтруем те, у которых нет пересечений
    const availableCars = allCars.map((c) => {
      const isConflicting = c.bookings.length > 0 || c.availabilityBlocks.length > 0;
      return {
        id: c.id,
        brand: c.brand,
        model: c.model,
        year: c.year,
        plateNumber: c.plateNumber,
        techPassportNumber: c.techPassportNumber,
        city: c.city,
        currentMileage: c.currentMileage,
        dailyRate: c.clientStandardDailyRate || 100,
        ownerPayoutRate: c.defaultOwnerDailyRate || 25,
        isStopBlocked: c.isStopBlocked,
        photoUrl: c.imageUrl,
        isAvailableForPeriod: !isConflicting,
        conflictReason: isConflicting
          ? c.bookings.length > 0
            ? "Уже забронирован на этот период"
            : "Блок доступности / СТО"
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      booking,
      availableCars,
    });
  } catch (error: any) {
    console.error("GET /api/bookings/[id]/swap-car error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка загрузки данных для замены авто" },
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
      newCarId,
      swapDate,
      daysOnOldCar: rawDaysOld,
      daysOnNewCar: rawDaysNew,
      oldCarMileageAtReturn,
      oldCarFuelLevel,
      oldCarCleanliness = "CLEAN",
      oldCarNextStatus = "AVAILABLE", // "AVAILABLE" | "STOP" | "NEEDS_WASH"
      oldCarCondition,
      newCarMileageAtHandover,
      newCarFuelLevel,
      swapReason, // "BREAKDOWN" | "CLIENT_DISLIKED" | "UPGRADE" | "ACCIDENT" | "OTHER"
      reasonDetails,
      financialAction = "NO_CHANGE", // "NO_CHANGE" | "CHARGE_CLIENT" | "REFUND_CLIENT" | "CUSTOM"
      oldDailyRate: rawOldRate,
      newDailyRate: rawNewRate,
      priceDifference: rawDiff,
      customNewTotal: rawCustomTotal,
      differencePaymentMethod = "CASH",
      differencePaymentStatus = "PENDING",
      managerName = "Менеджер смены",
      notes,
    } = body;

    if (!newCarId) {
      return NextResponse.json(
        { success: false, error: "Выберите новый автомобиль для замены" },
        { status: 400 }
      );
    }

    if (!swapReason) {
      return NextResponse.json(
        { success: false, error: "Укажите причину замены автомобиля" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        car: true,
        customer: true,
        pickupLocation: true,
        returnLocation: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Бронирование не найдено" },
        { status: 404 }
      );
    }

    const newCar = await prisma.car.findUnique({
      where: { id: newCarId },
      include: { city: true },
    });

    if (!newCar) {
      return NextResponse.json(
        { success: false, error: "Новый автомобиль не найден" },
        { status: 404 }
      );
    }

    const oldCar = booking.car;
    const swapDateTime = swapDate ? new Date(swapDate) : new Date();
    const originalEndDate = new Date(booking.endDate);

    const daysOnOldCar = Math.max(1, Number(rawDaysOld) || 1);
    const totalOriginalDays = Math.max(daysOnOldCar, booking.rentalDays || 1);
    const daysOnNewCar = Math.max(1, Number(rawDaysNew) || Math.max(1, totalOriginalDays - daysOnOldCar));

    const oldDailyRate = Number(rawOldRate) || booking.dailyRate || 100;
    const newDailyRate = Number(rawNewRate) || newCar.clientStandardDailyRate || oldDailyRate;

    const oldCarCost = daysOnOldCar * oldDailyRate;
    let newCarCost = daysOnNewCar * newDailyRate;
    let finalNewTotal = oldCarCost + newCarCost;
    let priceDifference = finalNewTotal - booking.totalAmount;

    if (financialAction === "NO_CHANGE") {
      finalNewTotal = booking.totalAmount;
      newCarCost = Math.max(0, booking.totalAmount - oldCarCost);
      priceDifference = 0;
    } else if (financialAction === "CUSTOM" && rawCustomTotal !== undefined) {
      finalNewTotal = Number(rawCustomTotal);
      newCarCost = Math.max(0, finalNewTotal - oldCarCost);
      priceDifference = finalNewTotal - booking.totalAmount;
    } else if (rawDiff !== undefined) {
      priceDifference = Number(rawDiff);
      finalNewTotal = booking.totalAmount + priceDifference;
      newCarCost = Math.max(0, finalNewTotal - oldCarCost);
    }

    // 1. Update Old Car Status & Mileage
    const oldCarUpdateData: any = {};
    if (oldCarMileageAtReturn && Number(oldCarMileageAtReturn) > (oldCar.currentMileage || 0)) {
      oldCarUpdateData.currentMileage = Number(oldCarMileageAtReturn);
    }

    if (oldCarNextStatus === "STOP") {
      oldCarUpdateData.isStopBlocked = true;
      oldCarUpdateData.stopReason = reasonDetails || `Замена автомобиля: ${swapReason}`;
      oldCarUpdateData.stopBlockedAt = new Date();
    } else if (oldCarNextStatus === "AVAILABLE") {
      oldCarUpdateData.isStopBlocked = false;
      oldCarUpdateData.stopReason = null;
      oldCarUpdateData.stopBlockedAt = null;
    }

    if (Object.keys(oldCarUpdateData).length > 0) {
      await prisma.car.update({
        where: { id: oldCar.id },
        data: oldCarUpdateData,
      });
    }

    // Если требуется мойка старого авто
    if (oldCarNextStatus === "NEEDS_WASH" || oldCarCleanliness !== "CLEAN") {
      await prisma.carWashTask.create({
        data: {
          carId: oldCar.id,
          bookingId: booking.id,
          washType: oldCarCleanliness === "DIRTY_INTERIOR" ? "INTERIOR" : oldCarCleanliness === "DIRTY_BODY" ? "BODY" : "FULL",
          cost: 20,
          status: "PENDING",
          priority: "NORMAL",
          notes: `Мойка после замены авто клиентом ${booking.customer.fullName} (${booking.bookingNumber})`,
        },
      });
    }

    // 2. Generate unique booking number for the replacement booking
    const baseNumber = booking.bookingNumber.replace(/-SWAP(-\d+)?$/i, "");
    let suffixCount = 2;
    let newBookingNumber = `${baseNumber}-SWAP`;
    while (await prisma.booking.findUnique({ where: { bookingNumber: newBookingNumber } })) {
      newBookingNumber = `${baseNumber}-SWAP-${suffixCount++}`;
    }

    const swapReasonLabels: Record<string, string> = {
      BREAKDOWN: "Техническая неисправность / поломка",
      CLIENT_DISLIKED: "Не понравился клиенту",
      UPGRADE: "Апгрейд по просьбе клиента",
      ACCIDENT: "ДТП / повреждение",
      LOGISTICS: "Операционная замена",
      OTHER: "Другая причина",
    };
    const swapReasonText = swapReasonLabels[swapReason] || swapReason;

    // 3. Update Old Booking (shorten to swapDateTime, status = COMPLETED)
    const oldOwnerPayout = daysOnOldCar * (booking.ownerDailyRate || oldCar.defaultOwnerDailyRate || 0);
    const updatedOldBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        endDate: swapDateTime,
        rentalDays: daysOnOldCar,
        rentalTotal: oldCarCost,
        totalAmount: oldCarCost,
        ownerTotalPayout: oldOwnerPayout,
        status: "COMPLETED",
        notes: (booking.notes ? booking.notes + "\n" : "") +
          `🔄 Автомобиль заменен на ${newCar.brand} ${newCar.model} (${newCar.plateNumber}) с ${swapDateTime.toLocaleString("ru-RU")}. Причина: ${swapReasonText} (${reasonDetails || "Без примечаний"}).`,
      },
    });

    // 4. Create New Booking on replacement car
    const newOwnerDailyRate = newCar.defaultOwnerDailyRate || 0;
    const newOwnerTotalPayout = daysOnNewCar * newOwnerDailyRate;

    const newBooking = await prisma.booking.create({
      data: {
        bookingNumber: newBookingNumber,
        carId: newCar.id,
        customerId: booking.customerId,
        startDate: swapDateTime,
        endDate: originalEndDate,
        rentalDays: daysOnNewCar,
        dailyRate: financialAction === "NO_CHANGE" ? booking.dailyRate : newDailyRate,
        rentalTotal: newCarCost,
        totalAmount: newCarCost,
        currency: booking.currency || "GEL",
        pickupLocationId: booking.pickupLocationId,
        returnLocationId: booking.returnLocationId,
        pickupType: booking.pickupType,
        returnType: booking.returnType,
        status: "ACTIVE",
        actualHandoverAt: swapDateTime,
        ownerDailyRate: newOwnerDailyRate,
        ownerTotalPayout: newOwnerTotalPayout,
        swappedFromBookingId: booking.id,
        notes: `🔄 Замена автомобиля с ${oldCar.brand} ${oldCar.model} (${oldCar.plateNumber}). Исходная бронь: ${booking.bookingNumber}. Причина: ${swapReasonText}. ${notes ? `Примечание: ${notes}` : ""}`,
      },
    });

    // 5. Link old booking to new booking
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        swappedToBookingId: newBooking.id,
      },
    });

    // 6. Record in BookingCarSwap audit table
    const carSwapRecord = await prisma.bookingCarSwap.create({
      data: {
        bookingId: booking.id,
        newBookingId: newBooking.id,
        oldCarId: oldCar.id,
        oldCarMileageAtReturn: oldCarMileageAtReturn ? Number(oldCarMileageAtReturn) : null,
        oldCarFuelLevel: oldCarFuelLevel !== undefined ? Number(oldCarFuelLevel) : null,
        oldCarCleanliness,
        oldCarCondition: oldCarCondition || null,
        oldCarNextStatus,
        daysOnOldCar,
        newCarId: newCar.id,
        newCarMileageAtHandover: newCarMileageAtHandover ? Number(newCarMileageAtHandover) : (newCar.currentMileage || null),
        newCarFuelLevel: newCarFuelLevel !== undefined ? Number(newCarFuelLevel) : 100,
        daysOnNewCar,
        swappedAt: swapDateTime,
        oldDailyRate,
        newDailyRate,
        originalTotalAmount: booking.totalAmount,
        newTotalAmount: finalNewTotal,
        priceDifference,
        financialAction,
        differencePaymentMethod,
        differencePaymentStatus,
        swapReason,
        reasonDetails: reasonDetails || null,
        managerName,
        notes: notes || null,
      },
    });

    // 7. Handle Financial Difference Payments
    if (financialAction === "CHARGE_CLIENT" && priceDifference > 0 && differencePaymentStatus === "PAID") {
      await prisma.payment.create({
        data: {
          bookingId: newBooking.id,
          type: "RENTAL",
          amount: priceDifference,
          currency: booking.currency || "GEL",
          method: differencePaymentMethod,
          status: "PAID",
          managerName,
          notes: `Доплата за замену авто на более высокий класс (${oldCar.brand} -> ${newCar.brand}). Бронь: ${newBooking.bookingNumber}`,
        },
      });
    } else if (financialAction === "REFUND_CLIENT" && priceDifference < 0) {
      await prisma.bookingRefund.create({
        data: {
          bookingId: booking.id,
          amount: Math.abs(priceDifference),
          reason: `Возврат разницы при замене автомобиля на более экономичный (${oldCar.brand} -> ${newCar.brand})`,
          method: differencePaymentMethod,
          managerName,
          notes: reasonDetails || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Автомобиль успешно заменен! Создана активная бронь ${newBooking.bookingNumber} на ${newCar.brand} ${newCar.model}.`,
      swap: carSwapRecord,
      oldBooking: updatedOldBooking,
      newBooking,
    });
  } catch (error: any) {
    console.error("POST /api/bookings/[id]/swap-car error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка при выполнении замены автомобиля" },
      { status: 500 }
    );
  }
}
