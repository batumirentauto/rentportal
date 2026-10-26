import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityCode = searchParams.get("city"); // "TBS", "BUS", "KUT" or "ALL"
    const startDateParam = searchParams.get("startDate");
    const daysCount = parseInt(searchParams.get("days") || "14", 10);
    const includeArchived = searchParams.get("includeArchived") === "true";

    const baseDate = startDateParam ? new Date(startDateParam) : new Date();
    baseDate.setHours(0, 0, 0, 0);

    const endDate = new Date(baseDate);
    endDate.setDate(endDate.getDate() + daysCount);
    endDate.setHours(23, 59, 59, 999);

    const carWhere: any = {};
    if (!includeArchived) {
      carWhere.isArchived = false;
    }
    if (cityCode && cityCode !== "ALL") {
      carWhere.city = { code: cityCode };
    }

    const cars = await prisma.car.findMany({
      where: carWhere,
      include: {
        city: true,
        availabilityBlocks: {
          where: { isActive: true },
          orderBy: { startDate: "asc" },
        },
        bookings: {
          where: {
            status: { notIn: ["CANCELLED"] },
          },
          include: {
            customer: true,
            pickupLocation: {
              include: { city: true },
            },
            returnLocation: {
              include: { city: true },
            },
            handoverReport: true,
            returnReport: true,
            payments: true,
            additionalDrivers: true,
            refunds: true,
            extensions: true,
          },
          orderBy: {
            startDate: "asc",
          },
        },
      },
      orderBy: [
        { city: { nameRu: "asc" } },
        { brand: "asc" },
      ],
    });

    // Формируем дни
    const days = [];
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      days.push({
        dateStr: d.toISOString().split("T")[0],
        dayNumber: d.getDate(),
        monthName: d.toLocaleDateString("ru-RU", { month: "short" }),
        weekdayName: d.toLocaleDateString("ru-RU", { weekday: "short" }),
        isToday: d.toDateString() === new Date().toDateString(),
        isWeekend,
        timestamp: d.getTime(),
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalCars = cars.length;
    let rentedToday = 0;
    let availableToday = 0;
    let oneWayActiveCount = 0;

    // Обогащаем автомобили и брони логистической информацией о смене городов
    const enrichedCars = cars.map((car) => {
      // Ищем все брони, где город выдачи != городу возврата
      const processedBookings = car.bookings.map((b) => {
        const isOneWay = b.pickupLocation.cityId !== b.returnLocation.cityId;
        const fromCity = b.pickupLocation.city;
        const toCity = b.returnLocation.city;

        if (isOneWay && b.status === "ACTIVE") {
          oneWayActiveCount++;
        }

        return {
          ...b,
          isOneWay,
          fromCityName: fromCity.nameRu,
          fromCityCode: fromCity.code,
          toCityName: toCity.nameRu,
          toCityCode: toCity.code,
          routeSummary: isOneWay
            ? `${fromCity.code} ➔ ${toCity.code} (${toCity.nameRu})`
            : `${fromCity.nameRu}`,
        };
      });

      // Определяем будущий город авто (куда он прибудет по последней завершенной или текущей поездке)
      let currentCity = car.city;
      let nextRelocation: { date: string; toCityName: string; toCityCode: string } | null = null;

      // Сортируем брони по дате возврата
      const sortedBookings = [...processedBookings].sort(
        (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
      );

      for (const b of sortedBookings) {
        if (b.isOneWay) {
          const endDate = new Date(b.endDate);
          if (endDate >= today) {
            nextRelocation = {
              date: endDate.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }),
              toCityName: b.toCityName,
              toCityCode: b.toCityCode,
            };
            break;
          }
        }
      }

      const isBusyToday = processedBookings.some((b) => {
        const bStart = new Date(b.startDate);
        const bEnd = new Date(b.endDate);
        return today >= bStart && today <= bEnd;
      });

      const isBlockedToday = car.isStopBlocked || car.availabilityBlocks.some((b) => {
        const bStart = new Date(b.startDate);
        const bEnd = b.endDate ? new Date(b.endDate) : null;
        return today >= bStart && (!bEnd || today <= bEnd);
      });

      if (isBusyToday || car.status === "RENTED" || isBlockedToday) {
        rentedToday++;
      } else {
        availableToday++;
      }

      return {
        ...car,
        bookings: processedBookings,
        availabilityBlocks: car.availabilityBlocks,
        currentCityName: currentCity.nameRu,
        currentCityCode: currentCity.code,
        nextRelocation,
      };
    });

    const occupancyRate = totalCars > 0 ? Math.round((rentedToday / totalCars) * 100) : 0;

    return NextResponse.json({
      success: true,
      baseDate: baseDate.toISOString().split("T")[0],
      days,
      cars: enrichedCars,
      stats: {
        totalCars,
        rentedToday,
        availableToday,
        oneWayActiveCount,
        occupancyRate,
      },
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("Error fetching fleet timeline:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch timeline" },
      { status: 500 }
    );
  }
}
