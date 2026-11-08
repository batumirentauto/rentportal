import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCarTankVolume } from "@/lib/fuelSpecs";
import { normalizePlateKey, formatGeorgianPlate } from "@/lib/car-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityCode = searchParams.get("city");
    const includeArchived = searchParams.get("includeArchived"); // "true", "only", "false"
    const brand = searchParams.get("brand");

    const where: any = {};
    if (includeArchived === "only") {
      where.isArchived = true;
    } else if (includeArchived !== "true" && includeArchived !== "ALL") {
      where.isArchived = false;
    }

    if (brand && brand !== "ALL") {
      where.brand = brand;
    }

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
        { brand: "asc" },
        { model: "asc" },
        { plateNumber: "asc" },
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
      tankVolumeLiters,
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

    const cleanPlateKey = normalizePlateKey(plateNumber);
    const cleanVin = vin ? vin.trim().toUpperCase() : null;

    // Check if car already exists by normalized plate or VIN
    const allCars = await prisma.car.findMany();
    const existing = allCars.find(
      (c) =>
        normalizePlateKey(c.plateNumber) === cleanPlateKey ||
        (cleanVin && c.vin && c.vin.trim().toUpperCase() === cleanVin)
    );

    if (existing) {
      // Direct update of existing car card - no duplication!
      const updateData: any = {};
      if (plateNumber) updateData.plateNumber = formatGeorgianPlate(plateNumber);
      if (cleanVin) updateData.vin = cleanVin;
      if (brand?.trim()) updateData.brand = brand.trim();
      if (model?.trim()) updateData.model = model.trim();
      if (year) updateData.year = Number(year);
      if (color) updateData.color = color;
      if (transmission) updateData.transmission = transmission;
      if (fuelType) updateData.fuelType = fuelType;
      if (cityId) updateData.cityId = cityId;
      if (ownerId !== undefined) updateData.ownerId = ownerId || null;
      if (carClass) updateData.carClass = carClass;
      if (clientMinDailyRate) updateData.clientMinDailyRate = Number(clientMinDailyRate);
      if (clientStandardDailyRate) updateData.clientStandardDailyRate = Number(clientStandardDailyRate);
      if (clientMaxDailyRate) updateData.clientMaxDailyRate = Number(clientMaxDailyRate);
      if (defaultOwnerDailyRate) updateData.defaultOwnerDailyRate = Number(defaultOwnerDailyRate);
      if (currentMileage) updateData.currentMileage = Number(currentMileage);
      if (pricingNotes) updateData.pricingNotes = pricingNotes;
      if (hasBatumiParking !== undefined) updateData.hasBatumiParking = Boolean(hasBatumiParking);
      if (batumiParkingPermitNumber !== undefined) updateData.batumiParkingPermitNumber = batumiParkingPermitNumber;
      if (batumiParkingExpiresAt) updateData.batumiParkingExpiresAt = new Date(batumiParkingExpiresAt);
      if (body.techPassportNumber) updateData.techPassportNumber = body.techPassportNumber;
      if (body.techPassportFrontUrl) updateData.techPassportFrontUrl = body.techPassportFrontUrl;
      if (body.techPassportBackUrl) updateData.techPassportBackUrl = body.techPassportBackUrl;
      if (body.techPassportFrontUrl || body.techPassportNumber || existing.hasTechPassport) {
        updateData.hasTechPassport = true;
      }

      const updatedCar = await prisma.car.update({
        where: { id: existing.id },
        data: updateData,
        include: {
          city: true,
          owner: true,
        },
      });

      return NextResponse.json({
        success: true,
        updated: true,
        car: updatedCar,
        message: `Карточка автомобиля ${updatedCar.brand} ${updatedCar.model} (${updatedCar.plateNumber}) успешно скорректирована данными техпаспорта!`,
      });
    }

    const formattedPlate = formatGeorgianPlate(plateNumber);
    const car = await prisma.car.create({
      data: {
        plateNumber: formattedPlate,
        vin: cleanVin || null,
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
        tankVolumeLiters: tankVolumeLiters !== undefined && tankVolumeLiters !== null && tankVolumeLiters !== ""
          ? Number(tankVolumeLiters)
          : getCarTankVolume({ brand, model, fuelType }),
        pricingNotes: pricingNotes || null,
        hasBatumiParking: Boolean(hasBatumiParking),
        batumiParkingPermitNumber: batumiParkingPermitNumber || null,
        batumiParkingExpiresAt: batumiParkingExpiresAt ? new Date(batumiParkingExpiresAt) : null,
        hasGpsTracker: hasGpsTracker !== false,
        isGpsFeeChargedToOwner: isGpsFeeChargedToOwner !== false,
        techPassportNumber: body.techPassportNumber || null,
        techPassportFrontUrl: body.techPassportFrontUrl || null,
        techPassportBackUrl: body.techPassportBackUrl || null,
        hasTechPassport: Boolean(body.techPassportFrontUrl || body.techPassportNumber),
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
