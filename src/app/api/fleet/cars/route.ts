import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityCode = searchParams.get("city");

    const where: any = {};
    if (cityCode && cityCode !== "ALL") {
      where.city = { code: cityCode };
    }

    const cars = await prisma.car.findMany({
      where,
      include: {
        city: true,
        owner: true,
        availabilityBlocks: {
          where: { isActive: true },
          orderBy: { startDate: "asc" },
        },
      },
      orderBy: [
        { city: { nameRu: "asc" } },
        { brand: "asc" },
      ],
    });

    const cities = await prisma.city.findMany({ orderBy: { nameRu: "asc" } });

    return NextResponse.json({ success: true, cars, cities });
  } catch (error: any) {
    console.error("Error fetching cars:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки автомобилей" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      plateNumber,
      vin,
      brand,
      model,
      year,
      color,
      transmission,
      fuelType,
      cityId,
      ownerId,
      carClass,
      clientMinDailyRate,
      clientStandardDailyRate,
      clientMaxDailyRate,
      defaultOwnerDailyRate,
      currentMileage,
      currentFuelPerc,
      pricingNotes,
      hasBatumiParking,
      batumiParkingPermitNumber,
      batumiParkingExpiresAt,
      hasGpsTracker,
      isGpsFeeChargedToOwner,
    } = body;

    if (!plateNumber || !brand || !model || !cityId) {
      return NextResponse.json(
        { success: false, error: "Обязательные поля: Госномер, Марка, Модель и Город присутствия" },
        { status: 400 }
      );
    }

    // Check if plateNumber already exists
    const existing = await prisma.car.findUnique({
      where: { plateNumber: plateNumber.trim().toUpperCase() },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Автомобиль с госномером ${plateNumber} уже зарегистрирован` },
        { status: 400 }
      );
    }

    const car = await prisma.car.create({
      data: {
        plateNumber: plateNumber.trim().toUpperCase(),
        vin: vin?.trim() || null,
        brand: brand.trim(),
        model: model.trim(),
        year: Number(year) || new Date().getFullYear(),
        color: color || "Белый",
        transmission: transmission || "AUTOMATIC",
        fuelType: fuelType || "PETROL",
        cityId,
        ownerId: ownerId || null,
        carClass: carClass || "COMFORT",
        clientMinDailyRate: Number(clientMinDailyRate) || 35,
        clientStandardDailyRate: Number(clientStandardDailyRate) || 50,
        clientMaxDailyRate: Number(clientMaxDailyRate) || 75,
        defaultOwnerDailyRate: Number(defaultOwnerDailyRate) || 25,
        currentMileage: Number(currentMileage) || 50000,
        currentFuelPerc: Number(currentFuelPerc) || 100,
        pricingNotes: pricingNotes || null,
        hasBatumiParking: Boolean(hasBatumiParking),
        batumiParkingPermitNumber: batumiParkingPermitNumber || null,
        batumiParkingExpiresAt: batumiParkingExpiresAt ? new Date(batumiParkingExpiresAt) : null,
        hasGpsTracker: hasGpsTracker !== false,
        isGpsFeeChargedToOwner: isGpsFeeChargedToOwner !== false,
        status: "AVAILABLE",
      },
      include: {
        city: true,
        owner: true,
      },
    });

    return NextResponse.json({
      success: true,
      car,
      message: `Автомобиль ${car.brand} ${car.model} (${car.plateNumber}) успешно добавлен в филиал ${car.city.nameRu}!`,
    });
  } catch (error: any) {
    console.error("Error creating car:", error);
    return NextResponse.json({ success: false, error: "Ошибка создания автомобиля: " + error.message }, { status: 500 });
  }
}
