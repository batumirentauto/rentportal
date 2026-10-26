import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityCode = searchParams.get("city") || "ALL";
    const carClassFilter = searchParams.get("class") || "ALL";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const customerIdParam = searchParams.get("customerId");

    // 1. Resolve Customer Profile
    let currentCustomer = null;
    let allCustomers = await prisma.customer.findMany({
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
      orderBy: { createdAt: "desc" },
    });

    if (customerIdParam) {
      currentCustomer = allCustomers.find((c) => c.id === customerIdParam) || null;
    }

    if (!currentCustomer && allCustomers.length > 0) {
      currentCustomer = allCustomers[0];
    }

    // Default fallback VIP profile if database is clean
    const defaultCustomer = {
      id: currentCustomer?.id || "vip-guest-default",
      fullName: currentCustomer?.fullName || "Постоянный VIP клиент",
      phone: currentCustomer?.phone || "+995 599 000 111",
      whatsapp: currentCustomer?.whatsapp || "+995599000111",
      email: currentCustomer?.email || "vip@vslrent.ge",
      passportNumber: currentCustomer?.passportNumber || "В базе (проверен)",
      driverLicenseNumber: currentCustomer?.driverLicenseNumber || "В базе (проверен)",
      isLoyalClient: true,
      loyaltyTier: currentCustomer?.loyaltyTier || "GOLD_VIP",
      discountPercent: currentCustomer?.discountPercent || 15,
      tripsCount: currentCustomer?.bookings?.length || 4,
      upgradeAvailable: true,
      activeBookings: currentCustomer?.bookings?.filter((b) => b.status === "ACTIVE") || [],
      recentBookings: currentCustomer?.bookings?.slice(0, 3) || [],
    };

    const discountPercent = defaultCustomer.discountPercent;

    // 2. Parse Dates for Availability Check
    let startFilterDate: Date | null = null;
    let endFilterDate: Date | null = null;

    if (startDateParam && endDateParam) {
      startFilterDate = new Date(`${startDateParam}T00:00:00`);
      endFilterDate = new Date(`${endDateParam}T23:59:59`);
    }

    // 3. Query Fleet
    const carWhere: any = {};
    if (cityCode !== "ALL") {
      carWhere.city = { code: cityCode };
    }
    if (carClassFilter !== "ALL") {
      carWhere.carClass = carClassFilter;
    }

    const cars = await prisma.car.findMany({
      where: carWhere,
      include: {
        city: true,
        availabilityBlocks: {
          where: { isActive: true },
        },
        bookings: {
          where: {
            status: { notIn: ["CANCELLED"] },
          },
          orderBy: { endDate: "desc" },
        },
      },
      orderBy: [{ brand: "asc" }, { model: "asc" }],
    });

    // Curated photo gallery map for models
    const modelPhotos: Record<string, string> = {
      "RAV4": "https://images.unsplash.com/photo-1581540222194-0def2dda95b8?auto=format&fit=crop&w=800&q=80",
      "Tucson": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
      "Camry": "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80",
      "Sportage": "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
      "Mustang": "https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=800&q=80",
      "Forester": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
      "Elantra": "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80",
      "E-Class": "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80",
      "Outlander": "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80",
      "Prado": "https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&w=800&q=80",
      "X5": "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80",
      "Q7": "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=800&q=80",
      "Escape": "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=80",
      "Accord": "https://images.unsplash.com/photo-1592853625511-ad025e990c74?auto=format&fit=crop&w=800&q=80",
      "Mazda 6": "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80",
      "Compass": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
      "Renegade": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
    };

    const enrichedCars = cars.map((car) => {
      // Real date collision check
      let isAvailableForDates = car.status !== "MAINTENANCE";

      if (startFilterDate && endFilterDate) {
        // Check bookings overlap
        const hasBookingOverlap = car.bookings.some((b) => {
          const bStart = new Date(b.startDate);
          const bEnd = new Date(b.endDate);
          return startFilterDate! <= bEnd && endFilterDate! >= bStart;
        });

        // Check availability blocks overlap
        const hasBlockOverlap = car.availabilityBlocks.some((blk) => {
          const blkStart = new Date(blk.startDate);
          const blkEnd = blk.endDate ? new Date(blk.endDate) : new Date("2099-12-31");
          return startFilterDate! <= blkEnd && endFilterDate! >= blkStart;
        });

        if (hasBookingOverlap || hasBlockOverlap) {
          isAvailableForDates = false;
        }
      } else {
        isAvailableForDates = car.status === "AVAILABLE";
      }

      // Base daily rate in GEL
      const standardRate = car.clientStandardDailyRate || 60;
      const vipDailyRate = Math.round(standardRate * (1 - discountPercent / 100));

      // VIP Upgrade Calculation:
      // If car is COMFORT, CROSSOVER or SUV, calculate upgrade price from ECONOMY/COMFORT
      let isUpgradeOffer = false;
      let upgradeFromClass = "";
      let upgradeDailyRate = vipDailyRate;
      let upgradeDailySavings = 0;

      const cClass = car.carClass || "COMFORT";
      if (cClass === "COMFORT") {
        isUpgradeOffer = true;
        upgradeFromClass = "ECONOMY";
        upgradeDailyRate = Math.round(vipDailyRate * 0.85); // 15% bonus upgrade discount
        upgradeDailySavings = standardRate - upgradeDailyRate;
      } else if (cClass === "CROSSOVER" || cClass === "SUV") {
        isUpgradeOffer = true;
        upgradeFromClass = "COMFORT";
        upgradeDailyRate = Math.round(vipDailyRate * 0.82); // 18% bonus upgrade discount
        upgradeDailySavings = standardRate - upgradeDailyRate;
      } else if (cClass === "PREMIUM") {
        isUpgradeOffer = true;
        upgradeFromClass = "CROSSOVER";
        upgradeDailyRate = Math.round(vipDailyRate * 0.88);
        upgradeDailySavings = standardRate - upgradeDailyRate;
      }

      const activeBooking = car.bookings[0] || null;
      let availableFromText = "Свободен на ваши даты";
      if (!isAvailableForDates) {
        if (activeBooking) {
          availableFromText = `Занят до ${new Date(activeBooking.endDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`;
        } else {
          availableFromText = "Недоступен на выбранные даты";
        }
      }

      // Image selection
      let imageUrl = car.cardBannerUrl || car.imageUrl;
      if (!imageUrl) {
        for (const [key, url] of Object.entries(modelPhotos)) {
          if (car.model.toLowerCase().includes(key.toLowerCase()) || car.brand.toLowerCase().includes(key.toLowerCase())) {
            imageUrl = url;
            break;
          }
        }
      }
      if (!imageUrl) {
        imageUrl = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80";
      }

      return {
        id: car.id,
        plateNumber: car.plateNumber,
        brand: car.brand,
        model: car.model,
        year: car.year,
        color: car.color,
        transmission: car.transmission === "AUTOMATIC" ? "Автомат" : "Механика",
        fuelType: car.fuelType === "PETROL" ? "Бензин" : car.fuelType === "DIESEL" ? "Дизель" : car.fuelType === "HYBRID" ? "Гибрид" : "Электро",
        engineVolume: car.engineVolume || "2.0L",
        currentMileage: car.currentMileage,
        currentFuelPerc: car.currentFuelPerc,
        status: car.status,
        carClass: cClass,
        isAvailableForDates,
        availableFromText,
        cityCode: car.city.code,
        cityName: car.city.nameRu,
        imageUrl,
        standardRate,
        vipDailyRate,
        discountPercent,
        // Upgrade perks
        isUpgradeOffer,
        upgradeFromClass,
        upgradeDailyRate,
        upgradeDailySavings,
      };
    });

    // Locations for pickup/return
    const locations = await prisma.location.findMany({
      include: { city: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      customer: defaultCustomer,
      customersList: allCustomers.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        discountPercent: c.discountPercent || 15,
        loyaltyTier: c.loyaltyTier || "GOLD_VIP",
      })),
      cars: enrichedCars,
      locations,
      totalCount: enrichedCars.length,
      availableCount: enrichedCars.filter((c) => c.isAvailableForDates).length,
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("GET /api/client-app/cars error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки автомобилей" }, { status: 500 });
  }
}
