import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const unreadBookings = await prisma.booking.findMany({
      where: {
        isAddedDuringDay: true,
        notifiedManager: false,
      },
      include: {
        car: {
          include: {
            city: true,
          },
        },
        customer: true,
        pickupLocation: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Автомобили, автоматически поставленные на СТОП (техосмотр/страховка)
    const stopBlockedCars = await prisma.car.findMany({
      where: {
        isStopBlocked: true,
      },
      include: {
        city: true,
        owner: true,
      },
      orderBy: {
        stopBlockedAt: "desc",
      },
    });

    // Бронирования с неявкой клиента через 3+ часа (выдача не оформлена менеджером)
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const overdueBookings = await prisma.booking.findMany({
      where: {
        startDate: {
          lte: threeHoursAgo,
        },
        actualHandoverAt: null,
        status: {
          in: ["CONFIRMED", "PENDING", "PREPARING"],
        },
        overdueDecision: null,
      },
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
      },
      orderBy: {
        startDate: "asc",
      },
    });

    // Задачи и поручения от руководителя, ожидающие выполнения менеджерами
    const pendingTasks = await prisma.managerTask.findMany({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      include: {
        car: {
          include: {
            city: true,
          },
        },
        city: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      unreadCount:
        unreadBookings.length +
        stopBlockedCars.length +
        overdueBookings.length +
        pendingTasks.length,
      notifications: unreadBookings,
      stopBlockedCars,
      stopBlockedCount: stopBlockedCars.length,
      overdueBookings,
      overdueCount: overdueBookings.length,
      pendingTasks,
      tasksCount: pendingTasks.length,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// Пометить уведомление как прочитанное
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (bookingId) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { notifiedManager: true },
      });
    } else {
      // Пометить все как прочитанные
      await prisma.booking.updateMany({
        where: { notifiedManager: false },
        data: { notifiedManager: true },
      });
    }

    return NextResponse.json({ success: true, message: "Notifications marked as read" });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update notification status" },
      { status: 500 }
    );
  }
}

// Симуляция создания новой срочной брони в течение дня (для демонстрации)
export async function POST() {
  try {
    // Найдем доступную машину
    const availableCar = await prisma.car.findFirst({
      where: { status: "AVAILABLE" },
      include: { city: true },
    });

    if (!availableCar) {
      return NextResponse.json(
        { success: false, error: "No available cars to create new booking" },
        { status: 400 }
      );
    }

    // Найдем локацию
    const location = await prisma.location.findFirst({
      where: { cityId: availableCar.cityId },
    });

    // Случайный клиент
    const customer = await prisma.customer.findFirst();
    if (!customer || !location) {
      return NextResponse.json(
        { success: false, error: "Missing customer or location seed" },
        { status: 400 }
      );
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `GEO-${new Date().getFullYear()}-URGENT-${randomSuffix}`;

    const startDate = new Date();
    startDate.setHours(startDate.getHours() + 2); // через 2 часа
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 3);

    const newBooking = await prisma.booking.create({
      data: {
        bookingNumber,
        carId: availableCar.id,
        customerId: customer.id,
        startDate,
        endDate,
        rentalDays: 3,
        pickupLocationId: location.id,
        pickupType: "AIRPORT",
        pickupAddress: `Срочная выдача в ${availableCar.city.nameRu}`,
        returnLocationId: location.id,
        returnType: "OFFICE",
        dailyRate: 75,
        rentalTotal: 225,
        deliveryFee: 15,
        extrasTotal: 10,
        totalAmount: 250,
        depositAmount: 300,
        currency: "USD",
        status: "CONFIRMED",
        notifiedManager: false,
        isAddedDuringDay: true, // Внимание: добавлена днем!
        extras: {
          create: [
            {
              type: "PHONE_HOLDER",
              name: "Держатель для телефона",
              quantity: 1,
              price: 5,
              isIssued: false,
            },
            {
              type: "CHARGER_TYPE_C",
              name: "Кабель Type-C",
              quantity: 1,
              price: 5,
              isIssued: false,
            },
          ],
        },
      },
      include: {
        car: {
          include: { city: true },
        },
        customer: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Срочная бронь успешно добавлена в расписание менеджера!",
      booking: newBooking,
    });
  } catch (error) {
    console.error("Error simulating daytime booking:", error);
    return NextResponse.json(
      { success: false, error: "Failed to simulate booking" },
      { status: 500 }
    );
  }
}
