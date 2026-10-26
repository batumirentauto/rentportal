import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { updates, carId, cityCode } = body;

    const cities = await prisma.city.findMany();
    const cityMapByCode = new Map(cities.map((c) => [c.code, c.id]));

    if (carId && cityCode) {
      const cityId = cityMapByCode.get(cityCode);
      if (!cityId) {
        return NextResponse.json({ success: false, error: "Город не найден" }, { status: 400 });
      }
      await prisma.car.update({
        where: { id: carId },
        data: { cityId },
      });
      return NextResponse.json({ success: true, message: "Город автомобиля обновлен" });
    }

    if (Array.isArray(updates) && updates.length > 0) {
      const operations = [];
      for (const item of updates) {
        const cityId = cityMapByCode.get(item.cityCode);
        if (item.carId && cityId) {
          operations.push(
            prisma.car.update({
              where: { id: item.carId },
              data: { cityId },
            })
          );
        }
      }
      await prisma.$transaction(operations);
      return NextResponse.json({
        success: true,
        message: `Обновлено городов для ${operations.length} авто`,
      });
    }

    return NextResponse.json({ success: false, error: "Не переданы данные для обновления" }, { status: 400 });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("Error updating car cities:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
