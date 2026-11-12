export interface DeliveryFeeParams {
  pickupCityCode?: string | null;
  pickupType?: string | null;
  pickupTime?: string | null;
  returnCityCode?: string | null;
  returnType?: string | null;
  returnTime?: string | null;
}

export function isNightDeliveryTime(time?: string | null): boolean {
  if (!time) return false;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return false;
  const hour = Number(match[1]);
  if (!Number.isFinite(hour)) return false;
  return hour >= 21 || hour < 8;
}

export function getLegDeliveryFee(
  cityCode?: string | null,
  locationType?: string | null,
  time?: string | null
): number {
  if (!cityCode || !locationType) return 0;

  if (cityCode === "BUS") {
    return 0;
  }

  if (cityCode === "KUT") {
    return locationType === "CUSTOM" ? 30 : 0;
  }

  if (cityCode === "TBS") {
    if (locationType === "CUSTOM" || locationType === "AIRPORT") {
      return isNightDeliveryTime(time) ? 50 : 30;
    }
    return 0;
  }

  return 0;
}

export function calculateDefaultDeliveryFee(params: DeliveryFeeParams): number {
  const pickupFee = getLegDeliveryFee(
    params.pickupCityCode,
    params.pickupType,
    params.pickupTime
  );
  const returnFee = getLegDeliveryFee(
    params.returnCityCode,
    params.returnType,
    params.returnTime
  );
  return pickupFee + returnFee;
}
