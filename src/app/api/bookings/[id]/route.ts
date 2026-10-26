import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id },
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
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error("Error fetching booking detail:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch booking details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Бронирование не найдено" },
        { status: 404 }
      );
    }

    // Если переданы данные клиента для обновления (например, распознанные документы)
    if (body.customer && booking.customerId) {
      const c = body.customer;
      await prisma.customer.update({
        where: { id: booking.customerId },
        data: {
          ...(c.fullName !== undefined && { fullName: c.fullName.trim() }),
          ...(c.phone !== undefined && { phone: c.phone.trim() }),
          ...(c.whatsapp !== undefined && { whatsapp: c.whatsapp?.trim() || null }),
          ...(c.telegram !== undefined && { telegram: c.telegram?.trim() || null }),
          ...(c.instagram !== undefined && { instagram: c.instagram?.trim() || null }),
          ...(c.source !== undefined && { source: c.source }),
          ...(c.email !== undefined && { email: c.email?.trim() || null }),
          ...(c.passportNumber !== undefined && { passportNumber: c.passportNumber.trim() }),
          ...(c.passportCountry !== undefined && { passportCountry: c.passportCountry?.trim() || null }),
          ...(c.passportPhotoUrl !== undefined && { passportPhotoUrl: c.passportPhotoUrl || null }),
          ...(c.driverLicenseNumber !== undefined && { driverLicenseNumber: c.driverLicenseNumber.trim() }),
          ...(c.driverLicensePhotoUrl !== undefined && { driverLicensePhotoUrl: c.driverLicensePhotoUrl || null }),
          ...(c.driverLicenseBackPhotoUrl !== undefined && { driverLicenseBackPhotoUrl: c.driverLicenseBackPhotoUrl || null }),
          ...(c.birthDate !== undefined && { birthDate: c.birthDate?.trim() || null }),
          ...(c.driverLicenseExpiry !== undefined && { driverLicenseExpiry: c.driverLicenseExpiry?.trim() || null }),
          ...(c.city !== undefined && { city: c.city?.trim() || null }),
          ...(c.notes !== undefined && { notes: c.notes?.trim() || null }),
        },
      });
    }

    // Редактирование параметров самого бронирования
    const bookingUpdateData: any = {};
    if (body.carId) {
      bookingUpdateData.carId = body.carId;
    }
    if (body.startDate) {
      bookingUpdateData.startDate = new Date(body.startDate);
    }
    if (body.endDate) {
      bookingUpdateData.endDate = new Date(body.endDate);
    }
    if (body.rentalDays !== undefined) {
      bookingUpdateData.rentalDays = Number(body.rentalDays);
    }
    if (body.pickupLocationId) {
      bookingUpdateData.pickupLocationId = body.pickupLocationId;
    }
    if (body.pickupType !== undefined) {
      bookingUpdateData.pickupType = body.pickupType;
    }
    if (body.pickupAddress !== undefined) {
      bookingUpdateData.pickupAddress = body.pickupAddress;
    }
    if (body.returnLocationId) {
      bookingUpdateData.returnLocationId = body.returnLocationId;
    }
    if (body.returnType !== undefined) {
      bookingUpdateData.returnType = body.returnType;
    }
    if (body.returnAddress !== undefined) {
      bookingUpdateData.returnAddress = body.returnAddress;
    }
    if (body.dailyRate !== undefined) {
      bookingUpdateData.dailyRate = Number(body.dailyRate);
    }
    if (body.rentalTotal !== undefined) {
      bookingUpdateData.rentalTotal = Number(body.rentalTotal);
    }
    if (body.deliveryFee !== undefined) {
      bookingUpdateData.deliveryFee = Number(body.deliveryFee);
    }
    if (body.extrasTotal !== undefined) {
      bookingUpdateData.extrasTotal = Number(body.extrasTotal);
    }
    if (body.totalAmount !== undefined) {
      bookingUpdateData.totalAmount = Number(body.totalAmount);
    }
    if (body.depositAmount !== undefined) {
      bookingUpdateData.depositAmount = Number(body.depositAmount);
    }
    if (body.source !== undefined) {
      bookingUpdateData.source = body.source;
    }
    if (body.currency) {
      bookingUpdateData.currency = body.currency;
    }
    if (body.ownerDailyRate !== undefined) {
      bookingUpdateData.ownerDailyRate = Number(body.ownerDailyRate);
    }
    if (body.ownerTotalPayout !== undefined) {
      bookingUpdateData.ownerTotalPayout = Number(body.ownerTotalPayout);
    }
    if (body.status) {
      bookingUpdateData.status = body.status;
    }
    if (body.overdueDecisionNotes !== undefined) {
      bookingUpdateData.overdueDecisionNotes = body.overdueDecisionNotes;
    }

    if (Object.keys(bookingUpdateData).length > 0) {
      await prisma.booking.update({
        where: { id },
        data: bookingUpdateData,
      });
    }

    const updatedBooking = await prisma.booking.findUnique({
      where: { id },
      include: {
        car: { include: { city: true } },
        customer: true,
        pickupLocation: { include: { city: true } },
        returnLocation: { include: { city: true } },
        extras: true,
        washTasks: true,
        handoverReport: true,
        returnReport: true,
        trafficFines: true,
        payments: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Данные бронирования и клиента успешно обновлены",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка при обновлении бронирования" },
      { status: 500 }
    );
  }
}
