import { describe, expect, it } from "vitest";
import { createSeedState } from "@/lib/data/seed";
import { forecastEndOfDaySurplus } from "@/lib/domain/forecast";

describe("end-of-day surplus forecast", () => {
  const now = new Date("2026-10-31T12:00:00+05:30");

  it("uses only known final leftovers from this donor's prior month", () => {
    const donations = createSeedState(now).donations;
    const result = forecastEndOfDaySurplus(donations, "donor-green-fork", now);

    expect(result).toEqual([{ unit: "servings", expectedLeftover: 30, sampleDays: 1 }]);
  });

  it("ignores today's listings, other donors, and unresolved listings", () => {
    const donations = createSeedState(now).donations;
    const currentListing = {
      ...donations.find((item) => item.id === "don-10")!,
      id: "today",
      status: "available" as const,
      createdAt: now.toISOString(),
    };

    expect(
      forecastEndOfDaySurplus([...donations, currentListing], "donor-green-fork", now)
    ).toEqual([{ unit: "servings", expectedLeftover: 30, sampleDays: 1 }]);
    expect(forecastEndOfDaySurplus(donations, "unknown-donor", now)).toEqual([]);
  });

  it("averages known outcomes by unit and includes zero-leftover delivery days", () => {
    const donations = createSeedState(now).donations;
    const donorHistory = donations.filter((item) => item.donorOrgId === "donor-lotus");

    expect(forecastEndOfDaySurplus(donorHistory, "donor-lotus", now)).toEqual([
      { unit: "servings", expectedLeftover: 2, sampleDays: 1 },
    ]);

    const delivered = donorHistory.find((item) => item.id === "don-07")!;
    const secondDay = {
      ...delivered,
      id: "fully-accepted",
      acceptedQuantity: delivered.quantity,
      createdAt: "2026-10-29T05:00:00.000Z",
    };
    expect(
      forecastEndOfDaySurplus([...donorHistory, secondDay], "donor-lotus", now)
    ).toEqual([{ unit: "servings", expectedLeftover: 1, sampleDays: 2 }]);
  });
});
