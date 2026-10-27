// База данных технических характеристик топливных баков и тарифов топлива

export const FUEL_PRICE_95_GEL = 4.30; // Актуальная цена 95-го бензина в Грузии (₾ за литр)
export const FUEL_PRICE_DIESEL_GEL = 4.70; // Актуальная цена дизельного топлива Евро-5 в Грузии (₾ за литр)

export function getFuelRate(car?: { fuelType?: string | null }): number {
  if (car?.fuelType === "DIESEL") return FUEL_PRICE_DIESEL_GEL;
  return FUEL_PRICE_95_GEL;
}

// Заводские объемы топливных баков популярных моделей автопарка (в литрах)
export const MODEL_TANK_VOLUMES: Record<string, number> = {
  // Toyota
  "Prius": 45,
  "Corolla": 50,
  "RAV4": 55,
  "Venza": 55,
  "Avalon": 60,
  "Camry": 60,
  "Sienna": 75,
  "Highlander": 68,
  "Land Cruiser": 93,
  "Prado": 87,
  // Ford
  "Escape": 57,
  "Fusion": 55,
  "Focus": 55,
  "Explorer": 70,
  // Jeep
  "Renegade": 48,
  "Compass": 51,
  "Patriot": 51,
  "Grand Cherokee": 93,
  "Wrangler": 70,
  // Lexus
  "ES 300h": 50,
  "ES": 50,
  "RX 350": 72,
  "RX": 72,
  "NX": 60,
  "GX": 87,
  "LX": 93,
  // Mitsubishi
  "Outlander": 60,
  "ASX": 63,
  "Pajero": 88,
  // BMW
  "325d": 57,
  "320i": 60,
  "3 Series": 60,
  "5 Series": 68,
  "X3": 65,
  "X5": 85,
  "X6": 85,
  // Volkswagen
  "Tiguan": 58,
  "Touareg": 75,
  "Jetta": 50,
  "Passat": 66,
  "Golf": 50,
  // Hyundai
  "Palisade": 71,
  "Santa Fe": 67,
  "Tucson": 54,
  "Elantra": 50,
  "Accent": 43,
  "Sonata": 60,
  // Subaru
  "Crosstrek": 63,
  "Forester": 63,
  "Outback": 63,
  "Legacy": 70,
  // Land Rover
  "Range Rover Velar": 82,
  "Range Rover": 86,
  "Range Rover Sport": 86,
  "Discovery": 85,
  "Evoque": 67,
  // Mazda
  "CX-5": 56,
  "CX-9": 74,
  "6": 62,
  "3": 51,
  // Mercedes-Benz
  "C 350": 66,
  "C-Class": 66,
  "E-Class": 66,
  "GLE": 85,
  "GLC": 66,
  // Fiat
  "500 Cabrio": 35,
  "500": 35,
  // Honda
  "Accord": 56,
  "Civic": 47,
  "CR-V": 53,
  // Audi
  "Q7": 85,
  "Q5": 70,
  "A6": 73,
  "A4": 58,
  "TT": 55,
  // Alfa Romeo
  "Giulia": 58,
  "Stelvio": 64,
  // Maserati
  "Ghibli": 80,
  "Levante": 80,
  // Chevrolet
  "Trailblazer": 50,
  "Cruze": 52,
  "Tahoe": 98,
  // Dodge
  "Grand Caravan": 76,
  "Challenger": 70,
  "Charger": 70,
  // Tesla / Electric
  "Model 3": 0,
  "Model Y": 0,
  "Model S": 0,
  "Model X": 0,
};

/**
 * Определение емкости бака автомобиля:
 * Сначала проверяется явное поле car.tankVolumeLiters.
 * Если не задано или дефолтное, определяется по модели из справочника.
 * Для электрокаров возвращается 0.
 */
export function getCarTankVolume(car?: {
  brand?: string | null;
  model?: string | null;
  tankVolumeLiters?: number | null;
  fuelType?: string | null;
}): number {
  if (car?.fuelType === "ELECTRIC") return 0;
  if (car?.tankVolumeLiters && car.tankVolumeLiters > 0) {
    return car.tankVolumeLiters;
  }
  const model = car?.model?.trim() || "";
  for (const [key, volume] of Object.entries(MODEL_TANK_VOLUMES)) {
    if (model.toLowerCase().includes(key.toLowerCase())) {
      return volume;
    }
  }
  return 60; // стандартный объем бака по умолчанию
}

/**
 * Расчет недостачи бензина при возврате
 * @param fuelShortagePercent Разница в процентах (Handover % - Return %)
 * @param tankVolumeLiters Емкость бака конкретного авто
 * @param pricePerLiter Тариф за литр бензина (4.30 ₾)
 */
export function calculateFuelShortage(
  fuelShortagePercent: number,
  tankVolumeLiters: number,
  pricePerLiter: number = FUEL_PRICE_95_GEL
): { shortageLiters: number; chargeAmount: number } {
  if (fuelShortagePercent <= 0 || tankVolumeLiters <= 0) {
    return { shortageLiters: 0, chargeAmount: 0 };
  }
  // Расчет недостающих литров: % / 100 * емкость
  const rawLiters = (fuelShortagePercent / 100) * tankVolumeLiters;
  const shortageLiters = Math.round(rawLiters * 10) / 10;
  const chargeAmount = Math.round(rawLiters * pricePerLiter);
  return { shortageLiters, chargeAmount };
}
