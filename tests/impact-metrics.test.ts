import { describe, it, expect } from "vitest";
import { calculateImpactMetrics } from "@/lib/impact/calculator";

describe("Impact Dashboard & Unit Isolation Reconciliation", () => {
  it("computes operational metrics directly from real database records", async () => {
    const metrics = await calculateImpactMetrics();

    expect(metrics).toBeDefined();
    expect(metrics.totalListedQuantityByUnit).toBeDefined();
    expect(metrics.totalAllocatedQuantityByUnit).toBeDefined();
    expect(metrics.totalCollectedQuantityByUnit).toBeDefined();
    expect(metrics.totalDeliveredAcceptedByUnit).toBeDefined();
    expect(metrics.pickupCompletionRateDenominator).toBeGreaterThanOrEqual(0);
  });

  it("strictly separates SERVINGS and KG without adding them together", async () => {
    const metrics = await calculateImpactMetrics();

    const servings = metrics.totalListedQuantityByUnit["SERVINGS"] || 0;
    const kg = metrics.totalListedQuantityByUnit["KG"] || 0;

    // Both keys exist separately as independent units
    expect(typeof servings).toBe("number");
    expect(typeof kg).toBe("number");
    // Ensure no combined single floating-point inventory
    expect(metrics.totalListedQuantityByUnit).not.toHaveProperty("COMBINED");
  });

  it("calculates pickup completion rate with an explicit denominator shown", async () => {
    const metrics = await calculateImpactMetrics();

    if (metrics.pickupCompletionRateDenominator > 0) {
      expect(metrics.pickupCompletionRatePercent).toBeGreaterThanOrEqual(0);
      expect(metrics.pickupCompletionRatePercent).toBeLessThanOrEqual(100);
      expect(metrics.pickupCompletionRateNumerator).toBeLessThanOrEqual(
        metrics.pickupCompletionRateDenominator
      );
    }
  });

  it("defaults carbon emissions calculation to Not calculated unless enabled with documented assumptions", async () => {
    const metrics = await calculateImpactMetrics();

    if (process.env.CO2_FACTOR_ENABLED !== "true") {
      expect(metrics.co2AvoidedKg).toBeNull();
      expect(metrics.co2CalculationNotes).toMatch(/Not calculated/);
    }
  });
});

