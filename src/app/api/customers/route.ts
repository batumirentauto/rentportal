import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim().toLowerCase() || "";
    const tier = searchParams.get("tier"); // "ALL", "PLATINUM_VIP", "GOLD_VIP", "STANDARD", "CORPORATE"
    const blacklisted = searchParams.get("blacklisted"); // "ALL", "YES", "NO"
    const hasDebt = searchParams.get("hasDebt"); // "ALL", "YES", "NO"

    const where: any = {};

    if (tier && tier !== "ALL") {
      where.loyaltyTier = tier;
    }

    if (blacklisted === "YES") {
      where.isBlacklisted = true;
    } else if (blacklisted === "NO") {
      where.isBlacklisted = false;
    }

    const allCustomers = await prisma.customer.findMany({
      where,
      include: {
        debts: {
          orderBy: {
            createdAt: "desc",
          },
        },
        bookings: {
          include: {
            car: {
              select: {
                id: true,
                brand: true,
                model: true,
                plateNumber: true,
              },
            },
          },
          orderBy: {
            startDate: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Map each customer with calculated debt metrics
    const customersWithDebts = allCustomers.map((c) => {
      let totalActiveDebt = 0;
      let activeDebtsCount = 0;
      (c.debts || []).forEach((d) => {
        if (d.status === "ACTIVE" || d.status === "PARTIALLY_PAID") {
          totalActiveDebt += Math.max(0, (d.amount || 0) - (d.paidAmount || 0));
          activeDebtsCount += 1;
        }
      });
      return {
        ...c,
        totalActiveDebt,
        activeDebtsCount,
      };
    });

    // Filter by debt if requested
    const debtFiltered = hasDebt === "YES"
      ? customersWithDebts.filter((c) => c.totalActiveDebt > 0)
      : hasDebt === "NO"
      ? customersWithDebts.filter((c) => c.totalActiveDebt === 0)
      : customersWithDebts;

    // Client-side query filter for text (matching name, phone, passport, license, email)
    const filteredCustomers = query
      ? debtFiltered.filter((c) => {
          return (
            c.fullName.toLowerCase().includes(query) ||
            c.phone.toLowerCase().includes(query) ||
            (c.passportNumber && c.passportNumber.toLowerCase().includes(query)) ||
            (c.driverLicenseNumber && c.driverLicenseNumber.toLowerCase().includes(query)) ||
            (c.email && c.email.toLowerCase().includes(query)) ||
            (c.city && c.city.toLowerCase().includes(query)) ||
            (c.tags && c.tags.toLowerCase().includes(query))
          );
        })
      : debtFiltered;

    // Calculate CRM Analytics & Metrics
    const totalCount = allCustomers.length;
    const blacklistedCount = allCustomers.filter((c) => c.isBlacklisted).length;
    const vipCount = allCustomers.filter(
      (c) => c.loyaltyTier === "PLATINUM_VIP" || c.loyaltyTier === "GOLD_VIP"
    ).length;

    let totalRevenueUSD = 0;
    let totalBookingsCount = 0;
    let totalCustomerDebtGEL = 0;
    let indebtedCustomersCount = 0;

    customersWithDebts.forEach((c) => {
      if (c.totalActiveDebt > 0) {
        totalCustomerDebtGEL += c.totalActiveDebt;
        indebtedCustomersCount += 1;
      }
      c.bookings.forEach((b) => {
        if (b.status !== "CANCELLED") {
          totalRevenueUSD += b.totalAmount || 0;
          totalBookingsCount += 1;
        }
      });
    });

    const averageLTV = totalCount > 0 ? Math.round(totalRevenueUSD / totalCount) : 0;

    return NextResponse.json({
      success: true,
      customers: filteredCustomers,
      summary: {
        totalCount,
        vipCount,
        blacklistedCount,
        totalRevenueUSD,
        totalBookingsCount,
        averageLTV,
        totalCustomerDebtGEL,
        indebtedCustomersCount,
      },
    });
  } catch (error) {
    console.error("Error fetching CRM customers:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      phone,
      whatsapp,
      telegram,
      instagram,
      source,
      email,
      passportNumber,
      passportCountry,
      passportPhotoUrl,
      driverLicenseNumber,
      driverLicensePhotoUrl,
      driverLicenseBackPhotoUrl,
      birthDate,
      driverLicenseExpiry,
      isLoyalClient,
      discountPercent,
      loyaltyTier,
      city,
      notes,
      tags,
      isBlacklisted,
      blacklistReason,
      trustRating,
    } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { success: false, error: "ФИО клиента обязательно для заполнения" },
        { status: 400 }
      );
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { success: false, error: "Номер телефона обязателен для связи" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp?.trim() || phone.trim(),
        telegram: telegram?.trim() || null,
        instagram: instagram?.trim() || null,
        source: source || "WHATSAPP",
        email: email?.trim() || null,
        passportNumber: passportNumber?.trim() || "Не указан",
        passportCountry: passportCountry?.trim() || "Грузия / Международный",
        passportPhotoUrl: passportPhotoUrl || null,
        driverLicenseNumber: driverLicenseNumber?.trim() || "Не указаны",
        driverLicensePhotoUrl: driverLicensePhotoUrl || null,
        driverLicenseBackPhotoUrl: driverLicenseBackPhotoUrl || null,
        birthDate: birthDate?.trim() || null,
        driverLicenseExpiry: driverLicenseExpiry?.trim() || null,
        isLoyalClient: isLoyalClient !== undefined ? Boolean(isLoyalClient) : true,
        discountPercent: Number(discountPercent) || 10,
        loyaltyTier: loyaltyTier || "GOLD_VIP",
        city: city?.trim() || null,
        notes: notes?.trim() || null,
        tags: tags?.trim() || null,
        isBlacklisted: Boolean(isBlacklisted),
        blacklistReason: blacklistReason?.trim() || null,
        trustRating: Number(trustRating) || 5,
      },
    });

    return NextResponse.json({
      success: true,
      customer,
      message: "Клиент успешно добавлен в базу CRM!",
    });
  } catch (error) {
    console.error("Error creating customer in CRM:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка при создании профиля клиента" },
      { status: 500 }
    );
  }
}
