import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cities = await prisma.city.findMany({
      include: {
        locations: true,
      },
      orderBy: {
        nameRu: "asc",
      },
    });

    let locations = await prisma.location.findMany({
      include: {
        city: true,
      },
      orderBy: [
        { city: { nameRu: "asc" } },
        { type: "asc" },
      ],
    });

    // Гарантируем, что для каждого города есть Офис, Аэропорт, Доставка и Вокзал
    const defaultTemplates: Record<string, Array<{ name: string; type: string; address: string }>> = {
      TBS: [
        { name: "Офис Тбилиси (пр. Руставели, 24)", type: "OFFICE", address: "Тбилиси, пр. Руставели, 24" },
        { name: "Аэропорт Тбилиси (TBS им. Шота Руставели)", type: "AIRPORT", address: "Международный аэропорт Тбилиси" },
        { name: "Доставка по адресу / Отель (Тбилиси)", type: "CUSTOM", address: "Адрес клиента в Тбилиси" },
        { name: "Ж/д вокзал Тбилиси (Центральный)", type: "OFFICE", address: "Тбилиси, Вокзальная пл., 1" },
      ],
      BUS: [
        { name: "Офис Батуми (ул. Зураба Горгиладзе, 54)", type: "OFFICE", address: "Батуми, ул. Горгиладзе, 54" },
        { name: "Аэропорт Батуми (BUS Александр Картвели)", type: "AIRPORT", address: "Международный аэропорт Батуми" },
        { name: "Доставка по адресу / Отель (Батуми)", type: "CUSTOM", address: "Адрес клиента в Батуми" },
        { name: "Ж/д вокзал Батуми (Центральный)", type: "OFFICE", address: "Батуми, шоссе Маяковского, 1" },
      ],
      KUT: [
        { name: "Аэропорт Кутаиси (KUT Давид Строитель / Копитнари)", type: "AIRPORT", address: "Международный аэропорт Кутаиси" },
        { name: "Офис Кутаиси (ул. Церетели, 12 / Центр)", type: "OFFICE", address: "Кутаиси, ул. Церетели, 12" },
        { name: "Доставка по адресу / Отель (Кутаиси)", type: "CUSTOM", address: "Адрес клиента в Кутаиси" },
        { name: "Ж/д вокзал Кутаиси (Центральный)", type: "OFFICE", address: "Кутаиси, пр. Ильи Чавчавадзе" },
      ],
    };

    // Если в каком-то городе не хватает локаций, создаем их в базе
    for (const city of cities) {
      const templates = defaultTemplates[city.code] || [];
      for (const tmpl of templates) {
        const existing = locations.find((l) => l.cityId === city.id && l.name.toLowerCase().includes(tmpl.name.slice(0, 10).toLowerCase()));
        if (!existing) {
          const created = await prisma.location.create({
            data: {
              cityId: city.id,
              name: tmpl.name,
              type: tmpl.type,
              address: tmpl.address,
            },
            include: { city: true },
          });
          locations.push(created);
        }
      }
    }

    return NextResponse.json({
      success: true,
      cities,
      locations,
    });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
