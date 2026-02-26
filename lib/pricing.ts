export type LaundryType = 'wash' | 'dry';
export type WeightCategory = 's' | 'm' | 'l';
export type LegacyWeightCategory = '0-4' | '6-10' | '10-20';
export type PickupType = 'now' | 'schedule';

export const DELIVERY_FEE = 50;
export const PICKUP_NOW_EXTRA_FEE = 20;

export function normalizeServiceTimeMinutes(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    return 50;
  }
  return value;
}

export function normalizeWeightCategory(
  weightCategory?: WeightCategory | LegacyWeightCategory,
): WeightCategory {
  if (weightCategory === 'm' || weightCategory === '6-10') return 'm';
  if (weightCategory === 'l' || weightCategory === '10-20') return 'l';
  return 's';
}

export function getWeightCategoryLabel(
  weightCategory?: WeightCategory | LegacyWeightCategory,
): string {
  const normalized = normalizeWeightCategory(weightCategory);
  if (normalized === 'm') return 'M (6-10 kg)';
  if (normalized === 'l') return 'L (10-20 kg)';
  return 'S (0-4 kg)';
}

export function getWashUnitPrice(
  weightCategory?: WeightCategory | LegacyWeightCategory,
): number {
  const normalized = normalizeWeightCategory(weightCategory);
  if (normalized === 'm') return 80;
  if (normalized === 'l') return 120;
  return 60;
}

export function calculateLaundryPrice(params: {
  laundryType?: LaundryType;
  weightCategory?: WeightCategory | LegacyWeightCategory;
  serviceTimeMinutes?: number;
}): number {
  const serviceTimeMinutes = normalizeServiceTimeMinutes(params.serviceTimeMinutes);
  const isDryLaundry = params.laundryType === 'dry';
  const unitPrice = isDryLaundry ? 20 : getWashUnitPrice(params.weightCategory);
  const calculated = (serviceTimeMinutes / 50) * unitPrice;
  return Math.round(calculated * 100) / 100;
}

export function calculateOrderPriceSummary(params: {
  laundryType?: LaundryType;
  weightCategory?: WeightCategory | LegacyWeightCategory;
  serviceTimeMinutes?: number;
  pickupType?: PickupType;
}) {
  const baseLaundryPrice = calculateLaundryPrice(params);
  const deliveryFee = DELIVERY_FEE;
  const pickupServiceFee = params.pickupType === 'now' ? PICKUP_NOW_EXTRA_FEE : 0;
  const totalPrice = Math.round((baseLaundryPrice + deliveryFee + pickupServiceFee) * 100) / 100;

  return {
    baseLaundryPrice,
    deliveryFee,
    pickupServiceFee,
    totalPrice,
  };
}
