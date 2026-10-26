import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await props.params;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        bookings: {
          include: {
            car: {
              include: {
                city: true,
              },
            },
            pickupLocation: true,
            returnLocation: true,
          },
          orderBy: {
            startDate: "desc",
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Клиент не найден" },
        { status: 404 }
      );
    }

    // Calculate customer metrics
    let totalSpentUSD = 0;
    let totalRentalDays = 0;
    customer.bookings.forEach((b) => {
      if (b.status !== "CANCELLED") {
        totalSpentUSD += b.totalAmount || 0;
        totalRentalDays += b.rentalDays || 0;
      }
    });

    return NextResponse.json({
      success: true,
      customer,
      metrics: {
        totalSpentUSD,
        totalRentalDays,
        bookingsCount: customer.bookings.length,
      },
    });
  } catch (error) {
    console.error("Error fetching customer dossier:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch customer profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await props.params;
    const body = await request.json();

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(body.fullName !== undefined && { fullName: body.fullName.trim() }),
        ...(body.phone !== undefined && { phone: body.phone.trim() }),
        ...(body.whatsapp !== undefined && { whatsapp: body.whatsapp?.trim() || null }),
        ...(body.telegram !== undefined && { telegram: body.telegram?.trim() || null }),
        ...(body.email !== undefined && { email: body.email?.trim() || null }),
        ...(body.passportNumber !== undefined && { passportNumber: body.passportNumber.trim() }),
        ...(body.passportCountry !== undefined && { passportCountry: body.passportCountry?.trim() || null }),
        ...(body.passportPhotoUrl !== undefined && { passportPhotoUrl: body.passportPhotoUrl || null }),
        ...(body.driverLicenseNumber !== undefined && { driverLicenseNumber: body.driverLicenseNumber.trim() }),
        ...(body.driverLicensePhotoUrl !== undefined && { driverLicensePhotoUrl: body.driverLicensePhotoUrl || null }),
        ...(body.driverLicenseBackPhotoUrl !== undefined && { driverLicenseBackPhotoUrl: body.driverLicenseBackPhotoUrl || null }),
        ...(body.birthDate !== undefined && { birthDate: body.birthDate?.trim() || null }),
        ...(body.driverLicenseExpiry !== undefined && { driverLicenseExpiry: body.driverLicenseExpiry?.trim() || null }),
        ...(body.isLoyalClient !== undefined && { isLoyalClient: Boolean(body.isLoyalClient) }),
        ...(body.discountPercent !== undefined && { discountPercent: Number(body.discountPercent) }),
        ...(body.loyaltyTier !== undefined && { loyaltyTier: body.loyaltyTier }),
        ...(body.city !== undefined && { city: body.city?.trim() || null }),
        ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
        ...(body.tags !== undefined && { tags: body.tags?.trim() || null }),
        ...(body.isBlacklisted !== undefined && { isBlacklisted: Boolean(body.isBlacklisted) }),
        ...(body.blacklistReason !== undefined && { blacklistReason: body.blacklistReason?.trim() || null }),
        ...(body.trustRating !== undefined && { trustRating: Number(body.trustRating) }),
      },
      include: {
        bookings: true,
      },
    });

    return NextResponse.json({
      success: true,
      customer: updatedCustomer,
      message: "Данные клиента успешно сохранены!",
    });
  } catch (error) {
    console.error("Error updating customer profile:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка при обновлении профиля клиента" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await props.params;

    // Check if customer has active bookings
    const activeBookings = await prisma.booking.findMany({
      where: {
        customerId,
        status: { in: ["ACTIVE", "CONFIRMED", "PREPARING"] },
      },
    });

    if (activeBookings.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Нельзя удалить клиента с активными или запланированными бронями. Завершите или отмените их перед удалением.",
        },
        { status: 400 }
      );
    }

    await prisma.customer.delete({
      where: { id: customerId },
    });

    return NextResponse.json({
      success: true,
      message: "Профиль клиента удален из базы CRM",
    });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка при удалении клиента" },
      { status: 500 }
    );
  }
}
