import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerId,
      customerName,
      customerPhone,
      carId,
      startDate,
      startTime = "10:00",
      rentalDays = 3,
      pickupLocationId,
      returnLocationId,
      selectedExtras = [],
      isClassUpgraded = false,
      upgradeFromClass,
      appliedDailyRate,
      customerNotes,
    } = body;

    if (!carId || !startDate || !pickupLocationId || !returnLocationId) {
      return NextResponse.json(
        { success: false, error: "Не заполнены обязательные поля бронирования" },
        { status: 400 }
      );
    }

    // 1. Fetch car
    const car = await prisma.car.findUnique({
      where: { id: carId },
      include: { city: true },
    });

    if (!car) {
      return NextResponse.json(
        { success: false, error: "Автомобиль не найден" },
        { status: 404 }
      );
    }

    // 2. Fetch or create Customer
    let customer = null;
    if (customerId && customerId !== "vip-guest-default") {
      customer = await prisma.customer.findUnique({ where: { id: customerId } });
    }

    if (!customer) {
      // Find existing customer by phone or create default VIP customer
      const targetPhone = customerPhone || "+995 599 000 111";
      customer = await prisma.customer.findFirst({
        where: { phone: targetPhone },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            fullName: customerName || "Постоянный VIP клиент",
            phone: targetPhone,
            whatsapp: targetPhone,
            email: "vip@vslrent.ge",
            passportNumber: "VIP-PASSPORT",
            driverLicenseNumber: "VIP-LICENSE",
            isLoyalClient: true,
            discountPercent: 15,
            loyaltyTier: "GOLD_VIP",
            trustRating: 100,
            notes: "Постоянный клиент, бронирует через персональное приложение",
          },
        });
      }
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
    const baseDailyRate = appliedDailyRate || car.clientStandardDailyRate || 60;
    const discountPercent = customer.discountPercent || 15;
    const dailyRate = isClassUpgraded
      ? Math.round(baseDailyRate)
      : Math.round(baseDailyRate * (1 - discountPercent / 100));

    const rentalTotal = dailyRate * Number(rentalDays);
    const extrasTotal = selectedExtras.length * 10 * Number(rentalDays);
    const totalAmount = rentalTotal + oneWayFee + extrasTotal;

    // Dates
    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    const endDateTime = new Date(startDateTime);
    endDateTime.setDate(endDateTime.getDate() + Number(rentalDays));

    // Booking number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `VIP-${randomSuffix}`;

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        carId,
        customerId: customer.id,
        startDate: startDateTime,
        endDate: endDateTime,
        rentalDays: Number(rentalDays),
        pickupLocationId,
        pickupType: "OFFICE",
        returnLocationId,
        returnType: "OFFICE",
        dailyRate,
        rentalTotal,
        deliveryFee: oneWayFee,
        extrasTotal,
        totalAmount,
        depositAmount: 0, // 0 GEL deposit for loyal VIP clients
        currency: "GEL",
        status: "CONFIRMED",
        isAddedDuringDay: true, // Urgent notification for dispatcher/manager
        isSelfServiceBooking: true,
        notifiedManager: false,
        overdueDecisionNotes: isClassUpgraded
          ? `🎁 Бесплатный апгрейд класса: повышен с ${upgradeFromClass || "эконом"} до ${car.carClass} без доплаты.`
          : undefined,
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
        cost: 20,
        notes: `Подготовка к выдаче постоянному VIP клиенту (${customer.fullName})${isClassUpgraded ? " [АПГРЕЙД КЛАССА]" : ""}`,
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
      { success: false, error: "Ошибка при оформлении бронирования" },
      { status: 500 }
    );
  }
}
