import type { Donation, QuantityUnit } from "@/lib/domain/types";

export interface SurplusForecast {
  unit: QuantityUnit;
  expectedLeftover: number;
  sampleDays: number;
}

const HISTORY_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function utcDayStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function knownLeftover(donation: Donation): number | undefined {
  if (donation.status === "delivered") {
    if (donation.acceptedQuantity === undefined) return undefined;
    return Math.max(0, donation.quantity - donation.acceptedQuantity);
  }
  if (donation.status === "expired" || donation.status === "rejected") {
    return donation.quantity;
  }
  return undefined;
}

export function forecastEndOfDaySurplus(
  donations: Donation[],
  donorOrgId: string,
  now: Date = new Date()
): SurplusForecast[] {
  const todayStart = utcDayStart(now);
  const samples = new Map<QuantityUnit, Map<number, number>>();

  for (const donation of donations) {
    if (donation.donorOrgId !== donorOrgId) continue;

    const createdAt = new Date(donation.createdAt);
    if (Number.isNaN(createdAt.getTime())) continue;

    const donationDay = utcDayStart(createdAt);
    const ageDays = (todayStart - donationDay) / DAY_MS;
    if (ageDays < 1 || ageDays > HISTORY_WINDOW_DAYS) continue;

    const leftover = knownLeftover(donation);
    if (leftover === undefined || !Number.isFinite(leftover) || leftover < 0) continue;

    const unitSamples = samples.get(donation.unit) ?? new Map<number, number>();
    unitSamples.set(donationDay, (unitSamples.get(donationDay) ?? 0) + leftover);
    samples.set(donation.unit, unitSamples);
  }

  return Array.from(samples, ([unit, days]) => {
    const quantities = Array.from(days.values());
    const average = quantities.reduce((total, quantity) => total + quantity, 0) / quantities.length;
    return {
      unit,
      expectedLeftover: Math.round(average),
      sampleDays: quantities.length,
    };
  }).sort((a, b) => b.expectedLeftover - a.expectedLeftover);
}
