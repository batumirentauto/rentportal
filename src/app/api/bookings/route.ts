import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityCode = searchParams.get("city"); // "TBS", "BUS", "KUT", "ALL"
    const status = searchParams.get("status"); // "COMPLETED", "ACTIVE", "CONFIRMED", "CANCELLED", "ALL"
    const carId = searchParams.get("carId");
    const query = searchParams.get("search")?.trim().toLowerCase() || searchParams.get("query")?.trim().toLowerCase() || "";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

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

    if (carId && carId !== "ALL") {
      whereClause.carId = carId;
    }

    if (dateFrom || dateTo) {
      whereClause.startDate = {};
      if (dateFrom) {
        whereClause.startDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.startDate.lte = new Date(dateTo);
      }
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
        startDate: order,
      },
    });

    const filteredBookings = query
      ? bookings.filter((b) => {
          const bookingNum = (b.bookingNumber || "").toLowerCase();
          const custName = (b.customer?.fullName || "").toLowerCase();
          const custPhone = (b.customer?.phone || "").toLowerCase();
          const carBrand = (b.car?.brand || "").toLowerCase();
          const carModel = (b.car?.model || "").toLowerCase();
          const carPlate = (b.car?.plateNumber || "").toLowerCase();
          const pickupLoc = (b.pickupLocation?.name || "").toLowerCase();
          const returnLoc = (b.returnLocation?.name || "").toLowerCase();

          return (
            bookingNum.includes(query) ||
            custName.includes(query) ||
            custPhone.includes(query) ||
            carBrand.includes(query) ||
            carModel.includes(query) ||
            carPlate.includes(query) ||
            pickupLoc.includes(query) ||
            returnLoc.includes(query)
          );
        })
      : bookings;

    return NextResponse.json({ success: true, bookings: filteredBookings });
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
      depositAmount = 0,
      source = "WHATSAPP",
      currency = "GEL",
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

    // Автоматическое создание нового клиента, если данные переданы в бронировании
    let finalCustomerId = customerId;
    if ((!finalCustomerId || finalCustomerId === "NEW_CUSTOMER") && body.newCustomer) {
      const {
        fullName,
        phone,
        passportNumber,
        driverLicenseNumber,
        passportCountry,
        passportPhotoUrl,
        driverLicensePhotoUrl,
        driverLicenseBackPhotoUrl,
        birthDate,
        driverLicenseExpiry,
        notes,
      } = body.newCustomer;
      if (fullName && phone) {
        const createdCustomer = await prisma.customer.create({
          data: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            whatsapp: phone.trim(),
            telegram: body.newCustomer.telegram?.trim() || null,
            instagram: body.newCustomer.instagram?.trim() || null,
            source: body.newCustomer.source || source || "WHATSAPP",
            passportNumber: passportNumber?.trim() || "Не указан",
            driverLicenseNumber: driverLicenseNumber?.trim() || "Не указаны",
            passportCountry: passportCountry?.trim() || "Грузия / Международный",
            passportPhotoUrl: passportPhotoUrl || null,
            driverLicensePhotoUrl: driverLicensePhotoUrl || null,
            driverLicenseBackPhotoUrl: driverLicenseBackPhotoUrl || null,
            birthDate: birthDate?.trim() || null,
            driverLicenseExpiry: driverLicenseExpiry?.trim() || null,
            notes: notes?.trim() || "Создан из формы бронирования",
            isLoyalClient: true,
            discountPercent: 10,
            loyaltyTier: "GOLD_VIP",
          },
        });
        finalCustomerId = createdCustomer.id;
      }
    }

    if (!finalCustomerId) {
      const firstCust = await prisma.customer.findFirst();
      if (firstCust) finalCustomerId = firstCust.id;
    }

    // Защита от пустых локаций
    let finalPickupLocId = pickupLocationId;
    let finalReturnLocId = returnLocationId;

    if (!finalPickupLocId) {
      const loc = (car?.cityId ? await prisma.location.findFirst({ where: { cityId: car.cityId } }) : null) || await prisma.location.findFirst();
      if (loc) finalPickupLocId = loc.id;
    }
    if (!finalReturnLocId) {
      finalReturnLocId = finalPickupLocId;
    }

    const newBooking = await prisma.booking.create({
      data: {
        bookingNumber,
        carId,
        customerId: finalCustomerId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        rentalDays,
        pickupLocationId: finalPickupLocId,
        pickupType,
        pickupAddress,
        returnLocationId: finalReturnLocId,
        returnType,
        returnAddress,
        dailyRate: Number(dailyRate),
        rentalTotal: Number(rentalTotal),
        deliveryFee: Number(deliveryFee || 0),
        extrasTotal: Number(extrasTotal || 0),
        totalAmount: Number(totalAmount),
        depositAmount: body.depositAmount !== undefined ? Number(body.depositAmount) : 0,
        source: body.source || source || "WHATSAPP",
        currency: currency || "GEL",
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
