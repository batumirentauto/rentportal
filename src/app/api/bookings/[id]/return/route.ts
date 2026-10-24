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
      managerName = "Менеджер смены (Грузия)",
      returnMileage,
      returnFuelLevel = 100,
      fuelDiscrepancyPerc = 0,
      fuelChargeAmount = 0,
      videoVerified = true,
      hasNewDamages = false,
      damagesDescription = null,
      damageChargeAmount = 0,
      damagePhotosJson = null,
      finesChecked = true,
      finesDetectedCount = 0,
      finesTotalAmountGEL = 0,
      finesTotalAmountUSD = 0,
      finesPaidByClientToCompany = false,
      selectedFineIds = [],
      depositAmount = 0,
      changeReturnedToClient = 0,
      deductionsTotal = 0,
      finalBalanceType = "ZERO_SETTLED", // "REFUND_TO_CLIENT" | "PAYMENT_BY_CLIENT" | "ZERO_SETTLED"
      finalBalanceAmount = 0,
      settlementMethod = "CASH", // "CASH", "CARD_POS", "TBC_BANK", "BOG_BANK"
      conditionNotes = "",
    } = body;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        car: {
          include: {
            city: true,
          },
        },
        customer: true,
        handoverReport: true,
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

    const now = new Date();
    const handoverMileage = booking.handoverReport?.mileageAtHandover || booking.car.currentMileage;
    const finalMileage = Number(returnMileage) || booking.car.currentMileage;
    const tripMileage = Math.max(0, finalMileage - handoverMileage);
    const finalFuel = Number(returnFuelLevel) || 100;
    const fuelAtHandover = booking.handoverReport?.fuelLevelPercent || 100;

    // 1. Создаем или обновляем детальный ReturnReport
    const returnReport = await prisma.returnReport.upsert({
      where: { bookingId: id },
      create: {
        bookingId: id,
        carId: booking.carId,
        managerName,
        mileageAtReturn: finalMileage,
        tripMileage,
        fuelLevelPercent: finalFuel,
        fuelLevelAtHandover: fuelAtHandover,
        fuelDiscrepancyPerc: Number(fuelDiscrepancyPerc) || 0,
        fuelChargeAmount: Number(fuelChargeAmount) || 0,
        videoVerified: Boolean(videoVerified),
        hasNewDamages: Boolean(hasNewDamages),
        damagesDescription: damagesDescription || null,
        damageChargeAmount: Number(damageChargeAmount) || 0,
        damagePhotosJson: damagePhotosJson || null,
        finesChecked: Boolean(finesChecked),
        finesDetectedCount: Number(finesDetectedCount) || 0,
        finesTotalAmountGEL: Number(finesTotalAmountGEL) || 0,
        finesTotalAmountUSD: Number(finesTotalAmountUSD) || 0,
        finesPaidByClientToCompany: Boolean(finesPaidByClientToCompany),
        depositAmount: Number(depositAmount) || 0,
        changeReturnedToClient: Number(changeReturnedToClient) || 0,
        deductionsTotal: Number(deductionsTotal) || 0,
        finalBalanceType,
        finalBalanceAmount: Number(finalBalanceAmount) || 0,
        settlementMethod,
        notes: conditionNotes,
        returnedAt: now,
      },
      update: {
        managerName,
        mileageAtReturn: finalMileage,
        tripMileage,
        fuelLevelPercent: finalFuel,
        fuelLevelAtHandover: fuelAtHandover,
        fuelDiscrepancyPerc: Number(fuelDiscrepancyPerc) || 0,
        fuelChargeAmount: Number(fuelChargeAmount) || 0,
        videoVerified: Boolean(videoVerified),
        hasNewDamages: Boolean(hasNewDamages),
        damagesDescription: damagesDescription || null,
        damageChargeAmount: Number(damageChargeAmount) || 0,
        damagePhotosJson: damagePhotosJson || null,
        finesChecked: Boolean(finesChecked),
        finesDetectedCount: Number(finesDetectedCount) || 0,
        finesTotalAmountGEL: Number(finesTotalAmountGEL) || 0,
        finesTotalAmountUSD: Number(finesTotalAmountUSD) || 0,
        finesPaidByClientToCompany: Boolean(finesPaidByClientToCompany),
        depositAmount: Number(depositAmount) || 0,
        changeReturnedToClient: Number(changeReturnedToClient) || 0,
        deductionsTotal: Number(deductionsTotal) || 0,
        finalBalanceType,
        finalBalanceAmount: Number(finalBalanceAmount) || 0,
        settlementMethod,
        notes: conditionNotes,
        returnedAt: now,
      },
    });

    // 2. Mark Booking as COMPLETED
    await prisma.booking.update({
      where: { id },
      data: {
        status: "COMPLETED",
        endDate: now,
      },
    });

    // 3. Обработка штрафов: если клиент оплатил штрафы компании при возврате
    if (finesPaidByClientToCompany && Array.isArray(selectedFineIds) && selectedFineIds.length > 0) {
      await prisma.trafficFine.updateMany({
        where: { id: { in: selectedFineIds } },
        data: {
          status: "PAID_BY_CLIENT_TO_COMPANY",
          deductedFromDeposit: depositAmount > 0,
          checkedByManager: managerName,
          notes: `Штраф оплачен клиентом ${booking.customer.fullName} компании при возврате авто (Бронь: ${booking.bookingNumber}). Сумма принята в кассу (${settlementMethod}), ожидает оплаты в полицию / protocol.ge`,
        },
      });

      // Финансовая проводка приема штрафа в кассу компании
      await prisma.payment.create({
        data: {
          bookingId: id,
          type: "OTHER",
          amount: Number(finesTotalAmountUSD) || (Number(finesTotalAmountGEL) / 2.7),
          currency: booking.currency || "USD",
          method: settlementMethod,
          status: "PAID",
          managerName,
          notes: `Прием оплаты штрафов ПДД (${finesTotalAmountGEL} GEL / $${finesTotalAmountUSD}) от клиента ${booking.customer.fullName}. Компания производит погашение в МВД Грузии.`,
        },
      });
    }

    // 4. Логируем возврат залога или сдачи
    if (finalBalanceType === "REFUND_TO_CLIENT" && Number(finalBalanceAmount) > 0) {
      await prisma.payment.create({
        data: {
          bookingId: id,
          type: "DEPOSIT_REFUND",
          amount: Number(finalBalanceAmount),
          currency: booking.currency || "USD",
          method: settlementMethod,
          status: "PAID",
          managerName,
          notes: `Выплата клиенту при завершении аренды: возврат залога/сдачи на руки (${settlementMethod}). Удержано: $${deductionsTotal}. Выдано сдачи: $${changeReturnedToClient}.`,
        },
      });
    } else if (finalBalanceType === "PAYMENT_BY_CLIENT" && Number(finalBalanceAmount) > 0) {
      await prisma.payment.create({
        data: {
          bookingId: id,
          type: "RENTAL",
          amount: Number(finalBalanceAmount),
          currency: booking.currency || "USD",
          method: settlementMethod,
          status: "PAID",
          managerName,
          notes: `Доплата клиентом при сдаче авто: $${finalBalanceAmount} (недостающее топливо: $${fuelChargeAmount}, штрафы: $${finesTotalAmountUSD}, повреждения: $${damageChargeAmount})`,
        },
      });
    }

    // 5. Запись в журнал пробега
    await prisma.mileageLog.create({
      data: {
        carId: booking.carId,
        mileage: finalMileage,
        source: "RETURN",
        bookingId: id,
        loggedBy: managerName,
        notes: `Возврат из аренды (${booking.bookingNumber}). Клиент: ${booking.customer.fullName}. Топливо: ${finalFuel}%. Пробег за аренду: ${tripMileage} км.`,
      },
    });

    // 6. 🚨 КРИТИЧЕСКАЯ БИЗНЕС-ЛОГИКА: АВТОМАТИЧЕСКАЯ ПОСТАНОВКА НА СТОП
    // Проверяем: закончился ли техосмотр или страховка?
    const car = booking.car;
    const isInspectionExpired = car.inspectionExpiryDate ? new Date(car.inspectionExpiryDate) <= now : false;
    const isInsuranceExpired = car.insuranceExpiryDate ? new Date(car.insuranceExpiryDate) <= now : false;

    let isStopBlocked = false;
    let stopReason: string | null = null;
    let newCarStatus = "AVAILABLE";

    if (isInspectionExpired || isInsuranceExpired) {
      isStopBlocked = true;
      newCarStatus = "MAINTENANCE_BLOCKED";

      if (isInspectionExpired && isInsuranceExpired) {
        stopReason = "Истекли государственный техосмотр (PTI) и полис страховки КАСКО";
      } else if (isInspectionExpired) {
        const expDateFormatted = new Date(car.inspectionExpiryDate!).toLocaleDateString("ru-RU");
        stopReason = `Истек государственный техосмотр (PTI) от ${expDateFormatted}`;
      } else {
        const expDateFormatted = new Date(car.insuranceExpiryDate!).toLocaleDateString("ru-RU");
        stopReason = `Истек страховой полис КАСКО от ${expDateFormatted}`;
      }

      await prisma.car.update({
        where: { id: car.id },
        data: {
          currentMileage: finalMileage,
          currentFuelPerc: finalFuel,
          status: "MAINTENANCE_BLOCKED",
          washStatus: "NEEDS_WASH",
          isStopBlocked: true,
          stopReason,
          stopBlockedAt: now,
          stopNotes: `Автоматическая блокировка после возврата от клиента ${booking.customer.fullName}. ${stopReason}. Новые бронирования заблокированы до продления документов.`,
        },
      });
    } else {
      // Автомобиль в порядке по документам — переводим в статус AVAILABLE и на мойку
      await prisma.car.update({
        where: { id: car.id },
        data: {
          currentMileage: finalMileage,
          currentFuelPerc: finalFuel,
          status: "AVAILABLE",
          washStatus: "NEEDS_WASH",
          isStopBlocked: false,
          stopReason: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: isStopBlocked
        ? `Автомобиль успешно принят, но АВТОМАТИЧЕСКИ ПОСТАВЛЕН НА СТОП! Причина: ${stopReason}`
        : "Автомобиль успешно принят из аренды, взаиморасчет произведен и авто направлено на мойку!",
      isStopBlocked,
      stopReason,
      returnReport,
      car: {
        id: car.id,
        brand: car.brand,
        model: car.model,
        plateNumber: car.plateNumber,
        status: newCarStatus,
        isStopBlocked,
        stopReason,
      },
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) throw error;
    console.error("POST /api/bookings/[id]/return error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process car return" },
      { status: 500 }
    );
  }
}
