import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") || "ALL";
    const carClass = searchParams.get("carClass") || "ALL";
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (city !== "ALL") {
      where.city = { code: city };
    }
    if (carClass !== "ALL") {
      where.carClass = carClass;
    }
    if (search.trim()) {
      where.OR = [
        { brand: { contains: search } },
        { model: { contains: search } },
        { plateNumber: { contains: search } },
        { owner: { fullName: { contains: search } } },
      ];
    }

    const cars = await prisma.car.findMany({
      where,
      include: {
        city: true,
        owner: true,
        bookings: {
          where: {
            status: { in: ["CONFIRMED", "ACTIVE", "PREPARING"] },
          },
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            dailyRate: true,
            ownerDailyRate: true,
          },
        },
      },
      orderBy: [
        { brand: "asc" },
        { model: "asc" },
      ],
    });

    const enrichedCars = cars.map((car) => {
      const ownerRate = car.defaultOwnerDailyRate || 25;
      const minRate = car.clientMinDailyRate || 35;
      const stdRate = car.clientStandardDailyRate || 50;
      const maxRate = car.clientMaxDailyRate || 75;

      const dailyMargin = Math.max(0, stdRate - ownerRate);
      const marginPercent = stdRate > 0 ? Math.round((dailyMargin / stdRate) * 100) : 0;

      const activeBooking = car.bookings.find((b) => b.status === "ACTIVE");

      return {
        id: car.id,
        plateNumber: car.plateNumber,
        vin: car.vin,
        brand: car.brand,
        model: car.model,
        year: car.year,
        color: car.color,
        transmission: car.transmission,
        fuelType: car.fuelType,
        carClass: car.carClass || "COMFORT",
        cityCode: car.city.code,
        cityName: car.city.nameRu,
        hasTechPassport: car.hasTechPassport,
        techPassportNumber: car.techPassportNumber,
        status: car.status,
        hasActiveBooking: !!activeBooking,
        owner: car.owner
          ? {
              id: car.owner.id,
              fullName: car.owner.fullName,
              phone: car.owner.phone,
              bankName: car.owner.bankName,
              bankIban: car.owner.bankIban,
            }
          : null,
        rates: {
          ownerDailyRate: ownerRate,
          clientMinRate: minRate,
          clientStandardRate: stdRate,
          clientMaxRate: maxRate,
          dailyMargin,
          marginPercent,
        },
        pricingNotes: car.pricingNotes || "",
      };
    });

    // Summary analytics for pricing
    const totalCars = enrichedCars.length;
    const avgOwnerRate = totalCars > 0 ? Math.round(enrichedCars.reduce((acc, c) => acc + c.rates.ownerDailyRate, 0) / totalCars) : 0;
    const avgStdClientRate = totalCars > 0 ? Math.round(enrichedCars.reduce((acc, c) => acc + c.rates.clientStandardRate, 0) / totalCars) : 0;
    const avgMargin = avgStdClientRate - avgOwnerRate;

    // Available owners for car assignment
    const allOwners = await prisma.carOwner.findMany({
      select: {
        id: true,
        fullName: true,
        phone: true,
      },
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({
      success: true,
      totalCars,
      summary: {
        avgOwnerRate,
        avgStdClientRate,
        avgMargin,
      },
      owners: allOwners,
      cars: enrichedCars,
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) throw error;
    console.error("GET /api/pricing error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pricing database" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      carId,
      ownerDailyRate,
      clientMinRate,
      clientStandardRate,
      clientMaxRate,
      carClass,
      pricingNotes,
      ownerId,
    } = body;

    if (!carId) {
      return NextResponse.json(
        { success: false, error: "carId is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (ownerDailyRate !== undefined) updateData.defaultOwnerDailyRate = Number(ownerDailyRate);
    if (clientMinRate !== undefined) updateData.clientMinDailyRate = Number(clientMinRate);
    if (clientStandardRate !== undefined) updateData.clientStandardDailyRate = Number(clientStandardRate);
    if (clientMaxRate !== undefined) updateData.clientMaxDailyRate = Number(clientMaxRate);
    if (carClass !== undefined) updateData.carClass = carClass;
    if (pricingNotes !== undefined) updateData.pricingNotes = pricingNotes;
    if (ownerId !== undefined) updateData.ownerId = ownerId || null;

    const updatedCar = await prisma.car.update({
      where: { id: carId },
      data: updateData,
      include: {
        city: true,
        owner: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Тарифная сетка для ${updatedCar.brand} ${updatedCar.model} (${updatedCar.plateNumber}) обновлена!`,
      car: updatedCar,
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) throw error;
    console.error("PATCH /api/pricing error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update car pricing" },
      { status: 500 }
    );
  }
}
