import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityCode = searchParams.get("city"); // "TBS", "BUS", "KUT"
    const status = searchParams.get("status");

    const whereClause: any = {};

    if (cityCode && cityCode !== "ALL") {
      whereClause.car = {
        city: {
          code: cityCode,
        },
      };
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        car: {
          include: {
            city: true,
          },
        },
        customer: true,
        pickupLocation: {
          include: {
            city: true,
          },
        },
        returnLocation: {
          include: {
            city: true,
          },
        },
        extras: true,
        washTasks: true,
        handoverReport: true,
        returnReport: true,
        trafficFines: true,
        payments: true,
      },
      orderBy: {
        startDate: "asc",
      },
    });

    return NextResponse.json({ success: true, bookings });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

// Создание новой брони (или симуляция поступления новой брони в течение дня)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      carId,
      customerId,
      startDate,
      endDate,
      rentalDays,
      pickupLocationId,
      pickupType = "OFFICE",
      pickupAddress,
      returnLocationId,
      returnType = "OFFICE",
      returnAddress,
      dailyRate = 60,
      rentalTotal = 120,
      deliveryFee = 0,
      extrasTotal = 0,
      totalAmount = 120,
      depositAmount = 300,
      currency = "USD",
      isAddedDuringDay = true,
      extras = [],
    } = body;

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const bookingNumber = `GEO-${new Date().getFullYear()}-${randomSuffix}`;

    const car = await prisma.car.findUnique({ where: { id: carId } });
    const effectiveOwnerDailyRate = body.ownerDailyRate !== undefined 
      ? Number(body.ownerDailyRate) 
      : (car?.defaultOwnerDailyRate || 25);
    const ownerTotalPayout = effectiveOwnerDailyRate * Number(rentalDays);

    const newBooking = await prisma.booking.create({
      data: {
        bookingNumber,
        carId,
        customerId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        rentalDays,
        pickupLocationId,
        pickupType,
        pickupAddress,
        returnLocationId,
        returnType,
        returnAddress,
        dailyRate: Number(dailyRate),
        rentalTotal: Number(rentalTotal),
        deliveryFee: Number(deliveryFee || 0),
        extrasTotal: Number(extrasTotal || 0),
        totalAmount: Number(totalAmount),
        depositAmount: Number(depositAmount || 300),
        currency: currency || "USD",
        ownerDailyRate: effectiveOwnerDailyRate,
        ownerTotalPayout,
        status: "CONFIRMED",
        notifiedManager: false,
        isAddedDuringDay,
        extras: {
          create: extras.map((e: any) => ({
            type: e.type,
            name: e.name,
            quantity: e.quantity || 1,
            price: e.price || 0,
            isIssued: false,
          })),
        },
      },
      include: {
        car: {
          include: {
            city: true,
          },
        },
        customer: true,
        pickupLocation: true,
        returnLocation: true,
        extras: true,
      },
    });

    return NextResponse.json({ success: true, booking: newBooking });
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
