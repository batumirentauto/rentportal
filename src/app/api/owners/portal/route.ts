import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerIdParam = searchParams.get("ownerId");
    const period = searchParams.get("period") || "thisMonth"; // "thisMonth", "30days", "all"

    // 1. Fetch all owners for switcher
    const allOwners = await prisma.carOwner.findMany({
      include: {
        cars: {
          include: { city: true },
        },
      },
      orderBy: { fullName: "asc" },
    });

    if (allOwners.length === 0) {
      return NextResponse.json({
        success: true,
        owners: [],
        selectedOwner: null,
      });
    }

    // Select active owner
    const selectedOwnerId = ownerIdParam || allOwners[0].id;
    const owner = await prisma.carOwner.findUnique({
      where: { id: selectedOwnerId },
      include: {
        cars: {
          include: {
            city: true,
            bookings: {
              where: { status: { notIn: ["CANCELLED"] } },
              include: {
                customer: true,
                pickupLocation: { include: { city: true } },
                returnLocation: { include: { city: true } },
              },
              orderBy: { startDate: "desc" },
            },
          },
        },
        payouts: {
          orderBy: { paidAt: "desc" },
        },
      },
    });

    if (!owner) {
      return NextResponse.json(
        { success: false, error: "Owner not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    let startDate = new Date();
    if (period === "thisMonth") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "30days") {
      startDate.setDate(startDate.getDate() - 30);
    } else {
      // all
      startDate = new Date(2020, 0, 1);
    }

    // Calculate metrics for owner's cars
    let totalOwnerEarningsUSD = 0;
    let totalDaysRented = 0;
    let activeRentedCarsNow = 0;

    // Collect all bookings for owner's cars
    const ownerBookingsList: any[] = [];

    const ownerCarsSummary = owner.cars.map((car) => {
      const isCurrentlyRented = car.status === "RENTED";
      if (isCurrentlyRented) activeRentedCarsNow++;

      // Active booking right now
      const activeBooking = car.bookings.find((b) => b.status === "ACTIVE") || null;

      // Period bookings
      const periodBookings = car.bookings.filter((b) => new Date(b.startDate) >= startDate);
      let carEarnings = 0;
      let carDays = 0;

      periodBookings.forEach((b) => {
        const rate = b.ownerDailyRate || car.defaultOwnerDailyRate || 25;
        const payout = b.ownerTotalPayout || rate * b.rentalDays;
        carEarnings += payout;
        carDays += b.rentalDays;

        ownerBookingsList.push({
          bookingId: b.id,
          bookingNumber: b.bookingNumber,
          carId: car.id,
          carBrand: car.brand,
          carModel: car.model,
          carPlate: car.plateNumber,
          customerName: b.customer?.fullName,
          startDate: b.startDate,
          endDate: b.endDate,
          rentalDays: b.rentalDays,
          status: b.status,
          pickupCity: b.pickupLocation?.city?.nameRu || "Грузия",
          defaultCarRate: car.defaultOwnerDailyRate,
          ownerDailyRate: rate,
          ownerTotalPayout: payout,
          isRateAdjusted: rate !== car.defaultOwnerDailyRate,
          createdAt: b.createdAt,
        });
      });

      totalOwnerEarningsUSD += carEarnings;
      totalDaysRented += carDays;

      // Days in period for utilization calculation
      const daysInPeriod = period === "thisMonth" ? now.getDate() : 30;
      const utilizationRate = Math.min(100, Math.round((carDays / daysInPeriod) * 100));

      return {
        id: car.id,
        plateNumber: car.plateNumber,
        brand: car.brand,
        model: car.model,
        year: car.year,
        color: car.color,
        cityName: car.city.nameRu,
        cityCode: car.city.code,
        status: car.status,
        currentMileage: car.currentMileage,
        currentFuelPerc: car.currentFuelPerc,
        defaultOwnerDailyRate: car.defaultOwnerDailyRate,
        daysRented: carDays,
        utilizationRate,
        earnedUSD: carEarnings,
        activeBooking: activeBooking
          ? {
              bookingNumber: activeBooking.bookingNumber,
              customerName: activeBooking.customer?.fullName,
              returnDate: activeBooking.endDate,
            }
          : null,
      };
    });

    // Payouts calculation
    const totalPaidOutUSD = owner.payouts.reduce((sum, p) => sum + p.amount, 0);
    const pendingBalanceUSD = Math.max(0, totalOwnerEarningsUSD - totalPaidOutUSD);

    // Sort bookings descending by date
    ownerBookingsList.sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );

    return NextResponse.json({
      success: true,
      owners: allOwners.map((o) => ({
        id: o.id,
        fullName: o.fullName,
        phone: o.phone,
        carsCount: o.cars.length,
        cities: Array.from(new Set(o.cars.map((c) => c.city.nameRu))),
      })),
      selectedOwner: {
        id: owner.id,
        fullName: owner.fullName,
        phone: owner.phone,
        email: owner.email,
        whatsapp: owner.whatsapp,
        bankName: owner.bankName,
        bankIban: owner.bankIban,
        payoutCurrency: owner.payoutCurrency,
        notes: owner.notes,
      },
      metrics: {
        totalCarsCount: owner.cars.length,
        activeRentedCarsNow,
        totalOwnerEarningsUSD,
        totalDaysRented,
        averageDailyRateUSD:
          totalDaysRented > 0 ? Math.round(totalOwnerEarningsUSD / totalDaysRented) : 0,
        totalPaidOutUSD,
        pendingBalanceUSD,
      },
      cars: ownerCarsSummary,
      bookings: ownerBookingsList,
      payouts: owner.payouts,
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("GET /api/owners/portal error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load owner portal data" },
      { status: 500 }
    );
  }
}

// Обновление ставок владельца (базовой ставки по авто или скорректированной ставки для конкретной брони)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { action, carId, defaultOwnerDailyRate, bookingId, ownerDailyRate, ownerTotalPayout } = body;

    // 1. Корректировка базовой суточной ставки авто
    if (action === "UPDATE_CAR_DEFAULT_RATE" && carId) {
      const car = await prisma.car.update({
        where: { id: carId },
        data: {
          defaultOwnerDailyRate: Number(defaultOwnerDailyRate),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Базовая ставка владельца для автомобиля успешно обновлена!",
        car,
      });
    }

    // 2. Корректировка индивидуальной ставки владельца по конкретной брони (например, скидка на длинную аренду)
    if (action === "UPDATE_BOOKING_RATE" && bookingId) {
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) {
        return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
      }

      const rate = Number(ownerDailyRate);
      const total = ownerTotalPayout ? Number(ownerTotalPayout) : rate * booking.rentalDays;

      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          ownerDailyRate: rate,
          ownerTotalPayout: total,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Ставка владельца и выплата по бронированию успешно скорректированы!",
        booking: updated,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("PATCH /api/owners/portal error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update owner rates" },
      { status: 500 }
    );
  }
}

// Зафиксировать выплату владельцу авто
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ownerId, amount, currency = "USD", paymentMethod = "BANK_TRANSFER", notes } = body;

    if (!ownerId || !amount) {
      return NextResponse.json(
        { success: false, error: "ownerId and amount are required" },
        { status: 400 }
      );
    }

    const payout = await prisma.ownerPayout.create({
      data: {
        ownerId,
        amount: Number(amount),
        currency,
        status: "PAID",
        paymentMethod,
        notes: notes || `Выплата владельцу (${paymentMethod})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Выплата владельцу авто успешно зафиксирована в реестре!",
      payout,
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("POST /api/owners/portal error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record owner payout" },
      { status: 500 }
    );
  }
}
