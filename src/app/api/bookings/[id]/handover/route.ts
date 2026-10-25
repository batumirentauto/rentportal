import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      managerName = "Менеджер смены",
      mileageAtHandover,
      fuelLevelPercent,
      techPassportVerified = true,
      clientBriefed = true,
      issuedExtras = [], // array of extra ids or names
      dashboardPhotoUrl,
      techPassportPhotoUrl,
      contractPhotoUrl,
      carBodyVideoUrl,
      notes,
      // Время выдачи и возврата:
      actualHandoverTime,
      actualHandoverDate,
      expectedReturnTime,
      expectedReturnDate,
      // Мойка авто перед выдачей:
      washOption = "NONE", // "NONE", "FULL" (20 GEL), "BODY" (10 GEL), "INTERIOR" (10 GEL)
      washCost = 0,
      washAccount = "CASH_BATUMI",
      // Финансовая часть:
      rentalAmount,
      rentalCurrency = "GEL",
      paymentMethod = "CASH", // "CASH", "CARD_POS", "TBC_BANK", "BOG_BANK", "CREDO_BANK", "CRYPTO"
      depositAmount = 300,
      depositCurrency = "GEL",
      depositMethod = "CASH",
      amountExpected,
      amountReceived,
      changeOnReturn = 0,
      paymentNotes,
    } = body;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { car: true, extras: true },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    const calculatedHandoverAt = actualHandoverDate && actualHandoverTime
      ? new Date(`${actualHandoverDate}T${actualHandoverTime}:00`)
      : new Date();

    const calculatedReturnAt = expectedReturnDate && expectedReturnTime
      ? new Date(`${expectedReturnDate}T${expectedReturnTime}:00`)
      : undefined;

    // 1. Создаем или обновляем HandoverReport
    const handoverReport = await prisma.handoverReport.upsert({
      where: { bookingId: id },
      update: {
        managerName,
        mileageAtHandover: Number(mileageAtHandover) || booking.car.currentMileage,
        fuelLevelPercent: Number(fuelLevelPercent) || booking.car.currentFuelPerc,
        techPassportVerified: Boolean(techPassportVerified),
        clientBriefed: Boolean(clientBriefed),
        issuedExtrasSummary: JSON.stringify(issuedExtras),
        dashboardPhotoUrl,
        techPassportPhotoUrl,
        contractPhotoUrl,
        carBodyVideoUrl,
        notes,
        actualHandoverTime: actualHandoverTime || undefined,
        expectedReturnTime: expectedReturnTime || undefined,
        expectedReturnDate: calculatedReturnAt,
        handedOverAt: calculatedHandoverAt,
      },
      create: {
        bookingId: id,
        carId: booking.carId,
        managerName,
        mileageAtHandover: Number(mileageAtHandover) || booking.car.currentMileage,
        fuelLevelPercent: Number(fuelLevelPercent) || booking.car.currentFuelPerc,
        techPassportVerified: Boolean(techPassportVerified),
        clientBriefed: Boolean(clientBriefed),
        issuedExtrasSummary: JSON.stringify(issuedExtras),
        dashboardPhotoUrl,
        techPassportPhotoUrl,
        contractPhotoUrl,
        carBodyVideoUrl,
        notes,
        actualHandoverTime: actualHandoverTime || undefined,
        expectedReturnTime: expectedReturnTime || undefined,
        expectedReturnDate: calculatedReturnAt,
        handedOverAt: calculatedHandoverAt,
      },
    });

    // 2. Создаем проводку за аренду и услуги
    const rentalPay = await prisma.payment.create({
      data: {
        bookingId: id,
        type: "RENTAL",
        amount: Number(rentalAmount) || booking.totalAmount,
        currency: rentalCurrency,
        method: paymentMethod,
        status: "PAID",
        amountExpected: Number(amountExpected) || Number(rentalAmount) || booking.totalAmount,
        amountReceived: Number(amountReceived) || Number(rentalAmount) || booking.totalAmount,
        changeOnReturn: Number(changeOnReturn) || 0,
        managerName,
        notes: paymentNotes || `Оплата аренды при выдаче (${paymentMethod})`,
      },
    });

    // 3. Создаем проводку депозита (если указан)
    let depositPay = null;
    if (depositAmount && Number(depositAmount) > 0) {
      depositPay = await prisma.payment.create({
        data: {
          bookingId: id,
          type: "DEPOSIT",
          amount: Number(depositAmount),
          currency: depositCurrency,
          method: depositMethod,
          status: "PAID",
          amountExpected: Number(depositAmount),
          amountReceived: Number(depositAmount),
          managerName,
          notes: `Залог/депозит за авто (${depositMethod}). Подлежит возврату при сдаче авто.`,
        },
      });
    }

    // 3.5. Автоматический учет мойки автомобиля при выдаче (20 ₾ полная, 10 ₾ кузов/салон)
    let washExpense = null;
    let washTask = null;
    const finalWashCost = Number(washCost) > 0
      ? Number(washCost)
      : (washOption === "FULL" ? 20 : (washOption === "BODY" || washOption === "INTERIOR") ? 10 : 0);

    if (washOption && washOption !== "NONE" && finalWashCost > 0) {
      const washTypeLabel = washOption === "FULL"
        ? "Полная мойка (20 ₾)"
        : washOption === "BODY"
        ? "Мойка кузова (10 ₾)"
        : "Мойка салона (10 ₾)";

      let account = await prisma.financialAccount.findFirst({ where: { currency: "GEL" } });
      if (!account) {
        account = await prisma.financialAccount.findFirst();
      }

      if (account) {
        washExpense = await prisma.expense.create({
          data: {
            accountId: account.id,
            category: "WASHING",
            amount: finalWashCost,
            currency: "GEL",
            carId: booking.carId,
            cityId: booking.car.cityId,
            managerName,
            description: `Мойка перед выдачей: ${washTypeLabel} — ${booking.car.brand} ${booking.car.model} (${booking.car.plateNumber}), бронь #${booking.bookingNumber}`,
            date: calculatedHandoverAt,
          },
        });
      }

      washTask = await prisma.carWashTask.create({
        data: {
          carId: booking.carId,
          bookingId: id,
          status: "COMPLETED",
          priority: "NORMAL",
          washType: washOption,
          cost: finalWashCost,
          notes: `Мойка проведена перед выдачей авто (${washTypeLabel})`,
        },
      });
    }

    // 4. Обновляем статус бронирования на ACTIVE ("В аренде"), фиксируем фактическое время выдачи и время возврата
    const bookingUpdateData: any = {
      status: "ACTIVE",
      actualHandoverAt: calculatedHandoverAt,
    };
    if (calculatedReturnAt) {
      bookingUpdateData.endDate = calculatedReturnAt;
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: bookingUpdateData,
    });

    // 5. Обновляем статус автомобиля на RENTED, чистоту на CLEAN и обновляем его актуальный пробег и топливо
    await prisma.car.update({
      where: { id: booking.carId },
      data: {
        status: "RENTED",
        washStatus: "CLEAN",
        currentMileage: Number(mileageAtHandover) || booking.car.currentMileage,
        currentFuelPerc: Number(fuelLevelPercent) || booking.car.currentFuelPerc,
      },
    });

    // 6. Помечаем выданное дополнительное оборудование
    if (issuedExtras && issuedExtras.length > 0) {
      await prisma.bookingExtra.updateMany({
        where: {
          bookingId: id,
          id: { in: issuedExtras },
        },
        data: {
          isIssued: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Автомобиль успешно выдан клиенту! Акт и платежи зафиксированы.",
      handoverReport,
      booking: updatedBooking,
      payments: [rentalPay, depositPay].filter(Boolean),
    });
  } catch (error) {
    console.error("Error executing vehicle handover:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete handover process" },
      { status: 500 }
    );
  }
}
