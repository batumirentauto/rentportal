import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        city: true,
        owner: {
          include: {
            cars: {
              include: { city: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const owners = await prisma.carOwner.findMany({
      include: {
        cars: true,
      },
      orderBy: { fullName: "asc" },
    });

    const cities = await prisma.city.findMany({
      orderBy: { nameRu: "asc" },
    });

    return NextResponse.json({
      success: true,
      users: users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        phone: u.phone,
        email: u.email,
        telegram: u.telegram,
        role: u.role,
        status: u.status,
        cityName: u.city?.nameRu || "Все филиалы",
        cityCode: u.city?.code || "ALL",
        cityId: u.cityId,
        ownerId: u.ownerId,
        ownerName: u.owner?.fullName,
        carsCount: u.owner?.cars?.length || 0,
        cars: u.owner?.cars?.map((c) => `${c.brand} ${c.model} (${c.plateNumber})`) || [],
        createdAt: u.createdAt,
      })),
      owners: owners.map((o) => ({
        id: o.id,
        fullName: o.fullName,
        phone: o.phone,
        carsCount: o.cars.length,
      })),
      cities: cities.map((c) => ({
        id: c.id,
        nameRu: c.nameRu,
        code: c.code,
      })),
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("GET /api/team error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch team users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId, fullName, phone, email, telegram, role = "MANAGER", cityId, ownerId, status = "ACTIVE" } = body;

    if (action === "DELETE" && userId) {
      await prisma.user.delete({ where: { id: userId } });
      return NextResponse.json({ success: true, message: "Пользователь удалён" });
    }

    if (action === "UPDATE_ROLE" && userId) {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role, status, cityId: cityId || null, ownerId: ownerId || null },
      });
      return NextResponse.json({ success: true, user: updated });
    }

    if (!fullName) {
      return NextResponse.json(
        { success: false, error: "Имя сотрудника / владельца обязательно" },
        { status: 400 }
      );
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        fullName,
        phone: phone || null,
        email: email || null,
        telegram: telegram || null,
        role,
        status,
        cityId: cityId || null,
        ownerId: ownerId || null,
      },
      include: {
        city: true,
        owner: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Пользователь успешно создан и добавлен в команду!",
      user: newUser,
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("POST /api/team error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save team user" },
      { status: 500 }
    );
  }
}
