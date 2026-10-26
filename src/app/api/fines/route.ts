import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityCode = searchParams.get("city") || "ALL";
    const status = searchParams.get("status") || "ALL";

    const carWhere: any = {};
    if (cityCode !== "ALL") {
      carWhere.city = { code: cityCode };
    }
    if (status !== "ALL") {
      carWhere.fineStatus = status;
    }

    const cars = await prisma.car.findMany({
      where: carWhere,
      include: {
        city: true,
        trafficFines: {
          orderBy: { violationDate: "desc" },
        },
        bookings: {
          where: { status: { in: ["ACTIVE", "CONFIRMED"] } },
          include: { customer: true },
          take: 1,
        },
      },
      orderBy: [{ city: { nameRu: "asc" } }, { brand: "asc" }],
    });

    // Calculate fines summary
    const allFines = await prisma.trafficFine.findMany({
      include: { car: { include: { city: true } } },
    });

    let totalUnpaidAmountGEL = 0;
    let totalDiscountAmountGEL = 0;
    let activeFinesCount = 0;

    allFines.forEach((f) => {
      if (f.status === "UNPAID") {
        totalUnpaidAmountGEL += f.amountGEL;
        totalDiscountAmountGEL += f.discountAmountGEL || Math.round(f.amountGEL * 0.8);
        activeFinesCount++;
      }
    });

    const cleanCarsCount = cars.filter((c) => c.fineStatus === "CLEAN").length;
    const fineDetectedCarsCount = cars.filter((c) => c.fineStatus === "FINE_DETECTED").length;

    return NextResponse.json({
      success: true,
      cars,
      fines: allFines,
      stats: {
        totalCars: cars.length,
        cleanCarsCount,
        fineDetectedCarsCount,
        activeFinesCount,
        totalUnpaidAmountGEL,
        totalDiscountAmountGEL,
      },
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("GET /api/fines error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch traffic fines" },
      { status: 500 }
    );
  }
}

// Зафиксировать проверку или добавить обнаруженный штраф
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      carId,
      bookingId,
      protocolNumber,
      violationDate,
      amountGEL,
      discountAmountGEL,
      articleName,
      sourcePortal = "POLICE_GE",
      notes,
      managerName = "Менеджер",
      markCarAsFineDetected = true,
    } = body;

    if (!carId || !protocolNumber || !amountGEL) {
      return NextResponse.json(
        { success: false, error: "carId, protocolNumber and amountGEL are required" },
        { status: 400 }
      );
    }

    const fine = await prisma.trafficFine.create({
      data: {
        carId,
        bookingId: bookingId || undefined,
        protocolNumber,
        violationDate: violationDate ? new Date(violationDate) : new Date(),
        amountGEL: Number(amountGEL),
        discountAmountGEL: discountAmountGEL ? Number(discountAmountGEL) : Math.round(Number(amountGEL) * 0.8),
        articleName: articleName || "Нарушение ПДД (видеофиксация)",
        sourcePortal,
        status: "UNPAID",
        checkedByManager: managerName,
        notes,
      },
    });

    // Update car status and check time
    await prisma.car.update({
      where: { id: carId },
      data: {
        lastFineCheckAt: new Date(),
        fineStatus: markCarAsFineDetected ? "FINE_DETECTED" : "CLEAN",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Штраф успешно зафиксирован в базе автопарка!",
      fine,
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("POST /api/fines error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create traffic fine" },
      { status: 500 }
    );
  }
}

// Обновить статус штрафа (оплачен / удержан из залога) или отметить машину чистой
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { action, carId, fineId, status, notes, managerName = "Менеджер" } = body;

    // Action 1: Быстрая отметка "Проверено на protocols.ge, штрафов нет"
    if (action === "VERIFIED_CLEAN" && carId) {
      const car = await prisma.car.update({
        where: { id: carId },
        data: {
          lastFineCheckAt: new Date(),
          fineStatus: "CLEAN",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Автомобиль успешно проверен: штрафов нет, статус обновлен!",
        car,
      });
    }

    // Action 2: Обновление статуса штрафа
    if (fineId) {
      const updateData: any = {
        updatedAt: new Date(),
      };
      if (status) updateData.status = status;
      if (status === "DEDUCTED_FROM_DEPOSIT") {
        updateData.deductedFromDeposit = true;
      }
      if (notes) updateData.notes = notes;

      const fine = await prisma.trafficFine.update({
        where: { id: fineId },
        data: updateData,
      });

      // If all fines for car are resolved, restore car status to CLEAN
      if (carId) {
        const remainingUnpaid = await prisma.trafficFine.count({
          where: { carId, status: "UNPAID" },
        });
        if (remainingUnpaid === 0) {
          await prisma.car.update({
            where: { id: carId },
            data: { fineStatus: "CLEAN", lastFineCheckAt: new Date() },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: "Статус штрафа обновлен!",
        fine,
      });
    }

    // Action 3: Обновление номера техпаспорта или фото
    if (action === "UPDATE_TECH_PASSPORT" && carId) {
      const { techPassportNumber, techPassportFrontUrl, techPassportBackUrl } = body;
      const car = await prisma.car.update({
        where: { id: carId },
        data: {
          techPassportNumber: techPassportNumber || undefined,
          techPassportFrontUrl: techPassportFrontUrl || undefined,
          techPassportBackUrl: techPassportBackUrl || undefined,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Данные техпаспорта автомобиля успешно сохранены!",
        car,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action or missing parameters" },
      { status: 400 }
    );
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("PATCH /api/fines error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update fine record" },
      { status: 500 }
    );
  }
}
