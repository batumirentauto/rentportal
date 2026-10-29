import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerAsyncFinancialSheetsSync } from "@/lib/financial-sheets-sync";

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
      depositAmount = 0,
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

    const effectiveManagerName = (managerName && managerName.trim() !== "Менеджер смены" && managerName.trim() !== "Менеджер смены (Грузия)")
      ? managerName.trim()
      : (managerName?.trim() || "Менеджер смены");

    // 1. Создаем или обновляем HandoverReport
    const handoverReport = await prisma.handoverReport.upsert({
      where: { bookingId: id },
      update: {
        managerName: effectiveManagerName,
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
        managerName: effectiveManagerName,
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

    // Находим персональную наличную кассу ответственного менеджера или создаем её
    let managerCashAcc = null;

    if (effectiveManagerName && effectiveManagerName !== "Менеджер смены") {
      // 1. Поиск персональной кассы менеджера
      managerCashAcc = await prisma.financialAccount.findFirst({
        where: {
          type: "CASH",
          OR: [
            { managerResponsible: { contains: effectiveManagerName } },
            { name: { contains: effectiveManagerName } },
            { user: { fullName: { contains: effectiveManagerName } } },
          ],
        },
      });

      // 2. Если кассы еще нет — создаем автоматически персональную кассу
      if (!managerCashAcc) {
        const user = await prisma.user.findFirst({
          where: { fullName: { contains: effectiveManagerName } },
        });
        const targetCityId = user?.cityId || booking.car.cityId || null;
        managerCashAcc = await prisma.financialAccount.create({
          data: {
            name: `Касса нал: ${effectiveManagerName}`,
            type: "CASH",
            currency: rentalCurrency || "GEL",
            bankName: "NONE",
            cityId: targetCityId || undefined,
            userId: user?.id || null,
            managerResponsible: effectiveManagerName,
            isManagerCash: true,
            initialBalance: 0,
            currentBalance: 0,
          },
        });
      }
    }

    // 3. Fallback: общая касса города без чужих персональных имен (Николоз и др.)
    if (!managerCashAcc && booking.car.cityId) {
      managerCashAcc = await prisma.financialAccount.findFirst({
        where: {
          type: "CASH",
          cityId: booking.car.cityId,
          AND: [
            { managerResponsible: { not: { contains: "Николоз" } } },
          ],
        },
      });
    }

    if (!managerCashAcc) {
      managerCashAcc = await prisma.financialAccount.findFirst({
        where: {
          type: "CASH",
          currency: "GEL",
          AND: [
            { managerResponsible: { not: { contains: "Николоз" } } },
          ],
        },
      });
    }

    // 2. Создаем проводку за аренду и услуги
    const rentalPay = await prisma.payment.create({
      data: {
        bookingId: id,
        type: "RENTAL",
        amount: Number(rentalAmount) || booking.totalAmount,
        currency: rentalCurrency,
        method: paymentMethod,
        status: "PAID",
        accountId: paymentMethod === "CASH" ? managerCashAcc?.id : undefined,
        amountExpected: Number(amountExpected) || Number(rentalAmount) || booking.totalAmount,
        amountReceived: Number(amountReceived) || Number(rentalAmount) || booking.totalAmount,
        changeOnReturn: Number(changeOnReturn) || 0,
        managerName: effectiveManagerName,
        notes: paymentNotes || `Оплата аренды при выдаче (${paymentMethod})`,
      },
    });

    // Если оплата наличными — пополняем баланс кассы менеджера
    if (paymentMethod === "CASH" && managerCashAcc) {
      await prisma.financialAccount.update({
        where: { id: managerCashAcc.id },
        data: { currentBalance: { increment: Number(rentalAmount) || booking.totalAmount } },
      });
    }

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
          accountId: depositMethod === "CASH" ? managerCashAcc?.id : undefined,
          amountExpected: Number(depositAmount),
          amountReceived: Number(depositAmount),
          managerName: effectiveManagerName,
          notes: `Залог/депозит за авто (${depositMethod}). Подлежит возврату при сдаче авто.`,
        },
      });

      if (depositMethod === "CASH" && managerCashAcc) {
        await prisma.financialAccount.update({
          where: { id: managerCashAcc.id },
          data: { currentBalance: { increment: Number(depositAmount) } },
        });
      }
    }

    // 3.5. Автоматическое начисление мойки автомобиля при выдаче (учёт в ежемесячном отчёте, оплата раз в месяц)
    let washExpense = null;
    let washTask = null;
    const finalWashCost = Number(washCost) > 0
      ? Number(washCost)
      : (washOption === "FULL" ? 20 : (washOption === "BODY" || washOption === "INTERIOR") ? 10 : 0);

    if (washOption && washOption !== "NONE" && finalWashCost > 0) {
      const washTypeLabel = washOption === "FULL"
        ? "Полная мойка"
        : washOption === "BODY"
        ? "Мойка кузова"
        : "Мойка салона";

      const accountForWash = managerCashAcc || (await prisma.financialAccount.findFirst({ where: { currency: "GEL" } }));

      if (accountForWash) {
        washExpense = await prisma.expense.create({
          data: {
            accountId: accountForWash.id,
            category: "WASHING",
            amount: finalWashCost,
            currency: "GEL",
            carId: booking.carId,
            cityId: booking.car.cityId,
            managerName: effectiveManagerName,
            status: "ACCRUED", // Начислено к ежемесячной оплате автомойке (не списывается с кармана менеджера)
            isMonthlySettled: false,
            description: `Начислено за мойку перед выдачей: ${washTypeLabel} — ${booking.car.brand} ${booking.car.model} (${booking.car.plateNumber}), бронь #${booking.bookingNumber}`,
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
          isSettled: false, // Начислено, оплачивается автомойке раз в месяц
          notes: `Выполнена ${washTypeLabel} перед выдачей клиенту. Начислено в ежемесячный отчёт.`,
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

    // Auto-sync financial & booking data to Google Sheets backup
    triggerAsyncFinancialSheetsSync();

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
