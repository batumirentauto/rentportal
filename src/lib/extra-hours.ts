/**
 * Расчёт стоимости дополнительных часов аренды:
 * - +1 час бесплатно
 * - Следующие 6 часов (со 2 по 7 час):
 *   * по 10 лари/час при цене авто до 160 лари в сутки
 *   * по 15 лари/час при цене авто от 161 до 260 лари в сутки
 *   * по 20 лари/час при цене авто от 261 лари в сутки
 * - Спустя 7 часов уже считаются следующие сутки (полная стоимость 1 дня по суточному тарифу)
 */

export interface ExtraHoursCalculation {
  hours: number;
  chargeableHours: number;
  ratePerHour: number;
  totalFee: number;
  isFullDay: boolean;
  explanation: string;
}

export function calculateExtraHoursFee(
  hours: number,
  dailyRate: number
): ExtraHoursCalculation {
  const safeHours = Math.max(0, Math.round(hours));
  const safeDailyRate = Math.max(0, dailyRate);

  if (safeHours <= 0) {
    return {
      hours: 0,
      chargeableHours: 0,
      ratePerHour: 0,
      totalFee: 0,
      isFullDay: false,
      explanation: "Без задержки / без доп. часов",
    };
  }

  // Определяем часовую ставку в зависимости от суточного тарифа
  let ratePerHour = 10;
  if (safeDailyRate > 260) {
    ratePerHour = 20;
  } else if (safeDailyRate >= 161) {
    ratePerHour = 15;
  } else {
    ratePerHour = 10;
  }

  // 1-й час всегда бесплатно
  if (safeHours <= 1) {
    return {
      hours: safeHours,
      chargeableHours: 0,
      ratePerHour,
      totalFee: 0,
      isFullDay: false,
      explanation: "+1 час бесплатно по регламенту",
    };
  }

  // Свыше 7 часов — считаются полные следующие сутки
  if (safeHours > 7) {
    return {
      hours: safeHours,
      chargeableHours: safeHours,
      ratePerHour,
      totalFee: safeDailyRate,
      isFullDay: true,
      explanation: `Задержка > 7 ч (${safeHours} ч) — начислены полные следующие сутки (${safeDailyRate} ₾)`,
    };
  }

  // Со 2 по 7 час: 1-й час бесплатно, остальные платные
  const chargeableHours = safeHours - 1;
  const totalFee = chargeableHours * ratePerHour;

  return {
    hours: safeHours,
    chargeableHours,
    ratePerHour,
    totalFee,
    isFullDay: false,
    explanation: `${chargeableHours} платн. ч × ${ratePerHour} ₾/ч (+1 ч бесплатно) = ${totalFee} ₾`,
  };
}
