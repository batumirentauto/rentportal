import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerId,
      carId,
      startDate,
      startTime = "10:00",
      rentalDays = 3,
      pickupLocationId,
      returnLocationId,
      selectedExtras = [],
      customerNotes,
    } = body;

    if (!customerId || !carId || !startDate || !pickupLocationId || !returnLocationId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields for self-service booking" },
        { status: 400 }
      );
    }

    // 1. Fetch car & customer
    const car = await prisma.car.findUnique({
      where: { id: carId },
      include: { city: true },
    });

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!car || !customer) {
      return NextResponse.json(
        { success: false, error: "Car or Customer not found" },
        { status: 404 }
      );
    }

    const pickupLocation = await prisma.location.findUnique({
      where: { id: pickupLocationId },
      include: { city: true },
    });

    const returnLocation = await prisma.location.findUnique({
      where: { id: returnLocationId },
      include: { city: true },
    });

    const isOneWay = pickupLocation?.cityId !== returnLocation?.cityId;
    const oneWayFee = isOneWay ? 50 : 0;

    // Rates calculation
    const baseDailyRate = 65; // fallback
    const discountPercent = customer.discountPercent || 10;
    const vipDailyRate = Math.round(baseDailyRate * (1 - discountPercent / 100));

    const rentalTotal = vipDailyRate * Number(rentalDays);
    const extrasTotal = selectedExtras.length * 10 * Number(rentalDays);
    const totalAmount = rentalTotal + oneWayFee + extrasTotal;

    // Dates
    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    const endDateTime = new Date(startDateTime);
    endDateTime.setDate(endDateTime.getDate() + Number(rentalDays));

    // Booking number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `GEO-VIP-${randomSuffix}`;

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        carId,
        customerId,
        startDate: startDateTime,
        endDate: endDateTime,
        rentalDays: Number(rentalDays),
        pickupLocationId,
        pickupType: "OFFICE",
        returnLocationId,
        returnType: "OFFICE",
        dailyRate: vipDailyRate,
        rentalTotal,
        deliveryFee: oneWayFee,
        extrasTotal,
        totalAmount,
        depositAmount: 300,
        currency: "USD",
        status: "CONFIRMED",
        isAddedDuringDay: true, // Urgent notification for dispatcher/manager
        isSelfServiceBooking: true,
        notifiedManager: false,
      },
    });

    // Create wash task for preparation
    await prisma.carWashTask.create({
      data: {
        carId,
        bookingId: booking.id,
        status: "PENDING",
        priority: "URGENT",
        washType: "FULL",
        cost: 25,
        notes: `Подготовка к выдаче постоянному клиенту (${customer.fullName})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Бронирование успешно подтверждено! Автомобиль зарезервирован.",
      booking: {
        ...booking,
        carName: `${car.brand} ${car.model}`,
        plateNumber: car.plateNumber,
        pickupLocationName: pickupLocation?.name,
        returnLocationName: returnLocation?.name,
      },
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("POST /api/client-app/bookings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create client booking" },
      { status: 500 }
    );
  }
}
