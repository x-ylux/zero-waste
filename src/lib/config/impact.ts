import type { QuantityUnit } from "@/lib/domain/types";

/**
 * Illustrative conversion factors only. These are not certified LCA values.
 * Impact is computed from NGO-confirmed accepted quantities, never from listed amounts.
 */
export const IMPACT_CONFIG = {
  label: "Illustrative estimate",
  assumptions: [
    "Accepted quantity is the only quantity counted toward meals or CO2e.",
    "Units are never added together. Each unit family is converted separately, then meal equivalents are summed.",
    "CO2e uses a generic literature-style factor for uneaten food, not a verified carbon credit.",
    "Pickup countdowns and QR records are operational metadata, not food-safety certification.",
  ],
  mealEquivalents: {
    servings: 1,
    kg: 2.5,
    packets: 1,
    boxes: 8,
  } satisfies Record<QuantityUnit, number>,
  kgCo2ePerMealEquivalent: 1.9,
  sources:
    "Meal equivalents and CO2e factors are placeholder planning values for the prototype, loosely informed by public food-waste literature. They are not certified savings.",
} as const;

export type ImpactConfig = typeof IMPACT_CONFIG;
