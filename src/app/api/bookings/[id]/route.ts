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
          ...(c.passportNumber !== undefined && { passportNumber: c.passportNumber.trim() }),
          ...(c.passportCountry !== undefined && { passportCountry: c.passportCountry?.trim() || null }),
          ...(c.passportPhotoUrl !== undefined && { passportPhotoUrl: c.passportPhotoUrl || null }),
          ...(c.driverLicenseNumber !== undefined && { driverLicenseNumber: c.driverLicenseNumber.trim() }),
          ...(c.driverLicensePhotoUrl !== undefined && { driverLicensePhotoUrl: c.driverLicensePhotoUrl || null }),
          ...(c.driverLicenseBackPhotoUrl !== undefined && { driverLicenseBackPhotoUrl: c.driverLicenseBackPhotoUrl || null }),
          ...(c.birthDate !== undefined && { birthDate: c.birthDate?.trim() || null }),
          ...(c.driverLicenseExpiry !== undefined && { driverLicenseExpiry: c.driverLicenseExpiry?.trim() || null }),
        },
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
