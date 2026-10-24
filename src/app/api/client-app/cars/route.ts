import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityCode = searchParams.get("city") || "ALL";
    const bodyClass = searchParams.get("class") || "ALL"; // "SUV", "SEDAN", "CABRIO", "ALL"
    const customerIdParam = searchParams.get("customerId");

    // 1. Get loyal customer profile
    let currentCustomer = null;
    if (customerIdParam) {
      currentCustomer = await prisma.customer.findUnique({
        where: { id: customerIdParam },
        include: {
          bookings: {
            include: {
              car: { include: { city: true } },
              pickupLocation: true,
              returnLocation: true,
            },
            orderBy: { startDate: "desc" },
          },
        },
      });
    }

    if (!currentCustomer) {
      // Default to first customer with bookings
      currentCustomer = await prisma.customer.findFirst({
        include: {
          bookings: {
            include: {
              car: { include: { city: true } },
              pickupLocation: true,
              returnLocation: true,
            },
            orderBy: { startDate: "desc" },
          },
        },
      });
    }

    const discountPercent = currentCustomer?.discountPercent || 10;

    // 2. Query Cars
    const carWhere: any = {};
    if (cityCode !== "ALL") {
      carWhere.city = { code: cityCode };
    }

    const cars = await prisma.car.findMany({
      where: carWhere,
      include: {
        city: true,
        bookings: {
          where: {
            status: { in: ["ACTIVE", "CONFIRMED", "PREPARING"] },
          },
          orderBy: { endDate: "desc" },
        },
      },
      orderBy: [{ status: "asc" }, { brand: "asc" }],
    });

    // Curated photo gallery map for mobile app presentation
    const carPhotos: Record<string, string> = {
      "TB-742-GE": "https://images.unsplash.com/photo-1581540222194-0def2dda95b8?auto=format&fit=crop&w=800&q=80", // RAV4
      "BA-918-GE": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80", // Tucson
      "TB-305-GE": "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80", // Camry
      "KU-551-GE": "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80", // Sportage
      "BA-007-GE": "https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=800&q=80", // Mustang
      "TB-448-GE": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80", // Forester
      "KU-230-GE": "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80", // Elantra
      "TB-999-GE": "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80", // Mercedes E
      "BA-332-GE": "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80", // Outlander
      "TB-800-GE": "https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&w=800&q=80", // Prado
    };

    // Standard daily market rates
    const standardRates: Record<string, number> = {
      "TB-742-GE": 70, // RAV4
      "BA-918-GE": 65, // Tucson
      "TB-305-GE": 60, // Camry
      "KU-551-GE": 60, // Sportage
      "BA-007-GE": 110, // Mustang Cabrio
      "TB-448-GE": 65, // Forester
      "KU-230-GE": 50, // Elantra
      "TB-999-GE": 130, // Mercedes E
      "BA-332-GE": 75, // Outlander
      "TB-800-GE": 140, // Prado
    };

    const enrichedCars = cars.map((car) => {
      const isAvailableNow = car.status === "AVAILABLE";
      const baseDailyRate = standardRates[car.plateNumber] || 65;
      const vipDailyRate = Math.round(baseDailyRate * (1 - discountPercent / 100));

      const activeBooking = car.bookings[0] || null;
      let availableFromDate = "Прямо сейчас";
      if (!isAvailableNow && activeBooking) {
        availableFromDate = new Date(activeBooking.endDate).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
        });
      }

      return {
        id: car.id,
        plateNumber: car.plateNumber,
        brand: car.brand,
        model: car.model,
        year: car.year,
        color: car.color,
        transmission: car.transmission === "AUTOMATIC" ? "Автомат" : "Механика",
        fuelType: car.fuelType,
        engineVolume: car.engineVolume,
        currentMileage: car.currentMileage,
        currentFuelPerc: car.currentFuelPerc,
        status: car.status,
        isAvailableNow,
        availableFromDate,
        cityCode: car.city.code,
        cityName: car.city.nameRu,
        imageUrl:
          carPhotos[car.plateNumber] ||
          "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
        baseDailyRate,
        vipDailyRate,
        discountPercent,
      };
    });

    // 3. Fetch Locations for pickup/return
    const locations = await prisma.location.findMany({
      include: { city: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      customer: currentCustomer
        ? {
            id: currentCustomer.id,
            fullName: currentCustomer.fullName,
            phone: currentCustomer.phone,
            whatsapp: currentCustomer.whatsapp,
            email: currentCustomer.email,
            passportNumber: currentCustomer.passportNumber,
            driverLicenseNumber: currentCustomer.driverLicenseNumber,
            isLoyalClient: currentCustomer.isLoyalClient,
            loyaltyTier: currentCustomer.loyaltyTier || "GOLD_VIP",
            discountPercent,
            tripsCount: currentCustomer.bookings.length,
            activeBookings: currentCustomer.bookings.filter((b) => b.status === "ACTIVE"),
            recentBookings: currentCustomer.bookings.slice(0, 3),
          }
        : null,
      cars: enrichedCars,
      locations,
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("GET /api/client-app/cars error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load mobile client cars" },
      { status: 500 }
    );
  }
}
