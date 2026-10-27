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
      returnVideoUrl = null,
      hasNewDamages = false,
      damagesDescription = null,
      damageChargeAmount = 0,
      damagePhotosJson = null,
      techPassportReturned = true,
      lostTechPassportCharge = 0,
      needsWash = true,
      cleanlinessState = "CLEAN", // "CLEAN" | "DIRTY_BODY" | "DIRTY_INTERIOR" | "FULL_WASH"
      extraWashFee = 0,
      finesChecked = true,
      finesDetectedCount = 0,
      finesTotalAmountGEL = 0,
      finesTotalAmountUSD = 0,
      finesPaidByClientToCompany = false,
      selectedFineIds = [],
      depositAmount = 0,
      changeReturnedToClient = 0,
      extraHoursCount = 0,
      extraHoursFee = 0,
      isExtraHoursPaid = false,
      deductionsTotal = 0,
      finalBalanceType = "ZERO_SETTLED", // "REFUND_TO_CLIENT" | "PAYMENT_BY_CLIENT" | "ZERO_SETTLED"
      finalBalanceAmount = 0,
      settlementMethod = "CASH", // "CASH", "CARD_POS", "TBC_BANK", "BOG_BANK"
      skipStopBlock = false, // Возможность принять авто без постановки на СТОП
      conditionNotes = "",
      // Навешивание долга на клиента при возврате
      recordAsDebt = false,
      debtAmount = 0,
      debtCategory = "GENERAL", // "FINES" | "DAMAGE" | "FUEL" | "RENTAL" | "WASH" | "GENERAL"
      debtDescription = "",
      debtDueDate = null,
      debtNotes = "",
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
    const car = booking.car;
    const handoverMileage = booking.handoverReport?.mileageAtHandover || car.currentMileage;
    const finalMileage = Number(returnMileage) || car.currentMileage;
    const tripMileage = Math.max(0, finalMileage - handoverMileage);
    const finalFuel = Number(returnFuelLevel) || 100;
    const fuelAtHandover = booking.handoverReport?.fuelLevelPercent || 100;

    // Контроль межсервисного интервала замены масла
    const lastOil = car.lastOilChangeMileage || 0;
    const oilInterval = car.oilChangeIntervalKm || 8000;
    const nextOilMileage = lastOil + oilInterval;
    const kmUntilOilChange = nextOilMileage - finalMileage;
    const isOilOverdue = kmUntilOilChange <= 0;
    const overdueKm = Math.abs(kmUntilOilChange);

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
        returnVideoUrl: returnVideoUrl || null,
        hasNewDamages: Boolean(hasNewDamages),
        damagesDescription: damagesDescription || null,
        damageChargeAmount: Number(damageChargeAmount) || 0,
        damagePhotosJson: damagePhotosJson || null,
        techPassportReturned: Boolean(techPassportReturned),
        lostTechPassportCharge: Number(lostTechPassportCharge) || 0,
        needsWash: Boolean(needsWash),
        cleanlinessState,
        oilOverdue: isOilOverdue,
        kmUntilOilChange,
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
        returnVideoUrl: returnVideoUrl || null,
        hasNewDamages: Boolean(hasNewDamages),
        damagesDescription: damagesDescription || null,
        damageChargeAmount: Number(damageChargeAmount) || 0,
        damagePhotosJson: damagePhotosJson || null,
        techPassportReturned: Boolean(techPassportReturned),
        lostTechPassportCharge: Number(lostTechPassportCharge) || 0,
        needsWash: Boolean(needsWash),
        cleanlinessState,
        oilOverdue: isOilOverdue,
        kmUntilOilChange,
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
        extraHoursCount: Number(extraHoursCount) || 0,
        extraHoursFee: Number(extraHoursFee) || 0,
        isExtraHoursPaid: Boolean(isExtraHoursPaid),
      },
    });

    // 2.5. Проводка оплаты доп. часов при сдаче авто, если не были оплачены ранее
    if (Number(extraHoursFee) > 0 && !isExtraHoursPaid) {
      await prisma.payment.create({
        data: {
          bookingId: id,
          type: "EXTRA",
          amount: Number(extraHoursFee),
          currency: booking.currency || "GEL",
          method: settlementMethod,
          status: "PAID",
          managerName,
          notes: `Оплата доп. часов при сдаче автомобиля (+${extraHoursCount} ч).`,
        },
      });
    }

    // 3. Обработка штрафов: если клиент оплатил штрафы компании при возврате
    // 3. Обработка штрафов: если клиент оплатил штрафы компании при возврате ИЛИ перенес в долг
    if (finesPaidByClientToCompany && Array.isArray(selectedFineIds) && selectedFineIds.length > 0) {
      if (recordAsDebt) {
        await prisma.trafficFine.updateMany({
          where: { id: { in: selectedFineIds } },
          data: {
            status: "TRANSFERRED_TO_CLIENT_DEBT",
            checkedByManager: managerName,
            notes: `Штрафы перенесены в личный долг клиента ${booking.customer.fullName} при возврате авто (Бронь: ${booking.bookingNumber}).`,
          },
        });
      } else {
        await prisma.trafficFine.updateMany({
          where: { id: { in: selectedFineIds } },
          data: {
            status: "PAID_BY_CLIENT_TO_COMPANY",
            deductedFromDeposit: depositAmount > 0,
            checkedByManager: managerName,
            notes: `Штраф оплачен клиентом ${booking.customer.fullName} компании при возврате авто (Бронь: ${booking.bookingNumber}). Сумма принята в кассу (${settlementMethod}), ожидает оплаты в полицию / protocols.ge`,
          },
        });

        // Финансовая проводка приема штрафа в кассу компании
        await prisma.payment.create({
          data: {
            bookingId: id,
            type: "OTHER",
            amount: Number(finesTotalAmountGEL),
            currency: booking.currency || "GEL",
            method: settlementMethod,
            status: "PAID",
            managerName,
            notes: `Прием оплаты штрафов ПДД (${finesTotalAmountGEL} ₾) от клиента ${booking.customer.fullName}. Компания производит погашение в МВД Грузии.`,
          },
        });
      }
    }

    // 3.5. 🚨 НАВЕШИВАНИЕ ДОЛГА НА КЛИЕНТА (ЕСЛИ ВЫБРАНО МЕНЕДЖЕРОМ)
    let createdCustomerDebt = null;
    const finalDebtValue = Number(debtAmount) > 0 ? Number(debtAmount) : (recordAsDebt ? Number(finalBalanceAmount) : 0);

    if (recordAsDebt && finalDebtValue > 0) {
      createdCustomerDebt = await prisma.customerDebt.create({
        data: {
          customerId: booking.customerId,
          bookingId: id,
          carId: booking.carId,
          carPlate: car.plateNumber,
          amount: finalDebtValue,
          paidAmount: 0,
          currency: booking.currency || "GEL",
          category: debtCategory || "GENERAL",
          description: debtDescription || `Долг при возврате ${car.brand} ${car.model} (${car.plateNumber})`,
          status: "ACTIVE",
          dueDate: debtDueDate ? new Date(debtDueDate) : null,
          createdByName: managerName,
          notes: debtNotes || `Зафиксирован долг при возврате авто ${booking.bookingNumber}. Согласовано менеджером ${managerName}`,
        },
      });
    }

    // 4. Логируем возврат залога или сдачи, либо доплату на месте
    if (finalBalanceType === "REFUND_TO_CLIENT" && Number(finalBalanceAmount) > 0) {
      await prisma.payment.create({
        data: {
          bookingId: id,
          type: "DEPOSIT_REFUND",
          amount: Number(finalBalanceAmount),
          currency: booking.currency || "GEL",
          method: settlementMethod,
          status: "PAID",
          managerName,
          notes: `Выплата клиенту при завершении аренды: возврат залога/сдачи на руки (${settlementMethod}). Удержано: ${deductionsTotal} ₾. Выдано сдачи: ${changeReturnedToClient} ₾.`,
        },
      });
    } else if (finalBalanceType === "PAYMENT_BY_CLIENT" && Number(finalBalanceAmount) > 0) {
      // Если часть или вся сумма переведена в долг:
      const amountPaidNow = recordAsDebt ? Math.max(0, Number(finalBalanceAmount) - finalDebtValue) : Number(finalBalanceAmount);

      if (amountPaidNow > 0) {
        await prisma.payment.create({
          data: {
            bookingId: id,
            type: "RENTAL",
            amount: amountPaidNow,
            currency: booking.currency || "GEL",
            method: settlementMethod,
            status: "PAID",
            managerName,
            notes: `Доплата клиентом на месте при сдаче авто: ${amountPaidNow} ₾ (недостающее топливо: ${fuelChargeAmount} ₾, штрафы: ${finesTotalAmountGEL} ₾, повреждения: ${damageChargeAmount} ₾, продление: ${extraHoursFee} ₾${extraWashFee > 0 ? `, мойка/уборка: ${extraWashFee} ₾` : ""})`,
          },
        });
      }
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
    // Проверяем: закончилась ли страховка, утерян ли оригинал техпаспорта или просрочена замена масла?
    const isInsuranceExpired = car.insuranceExpiryDate ? new Date(car.insuranceExpiryDate) <= now : false;
    const isTechPassportLost = !techPassportReturned;

    let isStopBlocked = false;
    const stopReasons: string[] = [];
    let newCarStatus = "AVAILABLE";

    if (isOilOverdue) {
      stopReasons.push(`Просрочена замена масла! Текущий пробег: ${finalMileage.toLocaleString()} км (лимит ТО: ${nextOilMileage.toLocaleString()} км, перепробег: +${overdueKm.toLocaleString()} км). Автомобиль требует замену масла на СТО`);
    }
    if (isTechPassportLost) {
      stopReasons.push("Утерян оригинал техпаспорта автомобиля. Требуется получение дубликата в Сервисном Агентстве МВД Грузии");
    }
    if (isInsuranceExpired) {
      const expDateFormatted = new Date(car.insuranceExpiryDate!).toLocaleDateString("ru-RU");
      stopReasons.push(`Истек страховой полис КАСКО от ${expDateFormatted}`);
    }

    if (stopReasons.length > 0 && !skipStopBlock) {
      isStopBlocked = true;
      newCarStatus = "MAINTENANCE_BLOCKED";
    }

    const stopReason = stopReasons.join(". ");
    const finalWashStatus = needsWash ? "NEEDS_WASH" : "CLEAN";

    if (isStopBlocked) {
      await prisma.car.update({
        where: { id: car.id },
        data: {
          currentMileage: finalMileage,
          currentFuelPerc: finalFuel,
          status: "MAINTENANCE_BLOCKED",
          washStatus: finalWashStatus,
          isStopBlocked: true,
          stopReason,
          stopBlockedAt: now,
          stopNotes: `Автоматическая блокировка после возврата от клиента ${booking.customer.fullName}. ${stopReason}. Новые бронирования заблокированы.`,
        },
      });
    } else {
      // Автомобиль переводим в статус AVAILABLE (или принят без СТОПа по решению менеджера)
      await prisma.car.update({
        where: { id: car.id },
        data: {
          currentMileage: finalMileage,
          currentFuelPerc: finalFuel,
          status: "AVAILABLE",
          washStatus: finalWashStatus,
          isStopBlocked: false,
          stopReason: null,
          stopNotes: skipStopBlock && stopReasons.length > 0
            ? `Принят без СТОПа менеджером ${managerName}. Предупреждения: ${stopReason}`
            : null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: isStopBlocked
        ? `Автомобиль успешно принят, но АВТОМАТИЧЕСКИ ПОСТАВЛЕН НА СТОП! Причина: ${stopReason}`
        : skipStopBlock && stopReasons.length > 0
        ? `Автомобиль принят БЕЗ СТОПа по решению менеджера (предупреждение: ${stopReason})`
        : needsWash
        ? "Автомобиль успешно принят из аренды, взаиморасчет произведен и авто направлено на мойку!"
        : "Автомобиль принят чистым (мойка не требуется), взаиморасчет закрыт, авто готово к выдаче!",
      isStopBlocked,
      stopReason: isStopBlocked ? stopReason : null,
      returnReport,
      customerDebt: createdCustomerDebt,
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
