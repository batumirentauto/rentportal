/**
 * Утилиты для работы с одометром и пробегом автомобилей
 * (пересчет миль и километров для американских и европейских авто)
 */

export const MILES_TO_KM = 1.609344;
export const KM_TO_MILES = 0.621371;

/**
 * Переводит мили в километры с округлением до целого
 */
export function milesToKm(miles: number): number {
  if (isNaN(miles) || miles < 0) return 0;
  return Math.round(miles * MILES_TO_KM);
}

/**
 * Переводит километры в мили с округлением до целого
 */
export function kmToMiles(km: number): number {
  if (isNaN(km) || km < 0) return 0;
  return Math.round(km * KM_TO_MILES);
}

/**
 * Форматирует пробег в километрах с пробелами
 */
export function formatKm(km: number): string {
  return `${(Math.round(km) || 0).toLocaleString("ru-RU")} км`;
}

/**
 * Форматирует пробег в милях с пробелами
 */
export function formatMiles(miles: number): string {
  return `${(Math.round(miles) || 0).toLocaleString("ru-RU")} mi`;
}
