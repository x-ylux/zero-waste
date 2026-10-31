import { describe, expect, it } from "vitest";
import { createSeedState } from "@/lib/data/seed";
import { dietaryCompatible, matchDonationToNgos, storageCompatible } from "@/lib/domain/matching";
import type { Donation, NgoProfile } from "@/lib/domain/types";

describe("needs-based matching", () => {
  const now = new Date("2026-10-31T12:00:00+05:30");
  const state = createSeedState(now);
  const donation = state.donations.find((item) => item.id === "don-01")!;

  it("applies hard eligibility checks before ranking", () => {
    const ranked = matchDonationToNgos(donation, state.ngos, state.needs, now);
    const sneha = ranked.find((item) => item.ngoId === "ngo-sneha");
    expect(sneha?.eligible).toBe(false);
    expect(sneha?.hardFailures.some((msg) => /storage|handling|hours|category/i.test(msg))).toBe(true);
  });

  it("ranks eligible NGOs and returns human-readable reasons", () => {
    const ranked = matchDonationToNgos(donation, state.ngos, state.needs, now);
    const eligible = ranked.filter((item) => item.eligible);
    expect(eligible.length).toBeGreaterThan(0);
    expect(eligible[0].score?.total).toBeGreaterThanOrEqual(eligible.at(-1)?.score?.total ?? 0);
    expect(eligible[0].reason).toMatch(/Recommended:/);
  });

  it("rejects dietary mismatches", () => {
    expect(dietaryCompatible(["contains_meat"], ["vegetarian"])).toBe(false);
    expect(dietaryCompatible(["vegetarian"], ["vegetarian"])).toBe(true);
    expect(dietaryCompatible(["vegan"], ["vegetarian"])).toBe(true);
  });

  it("requires hot-hold capability for hot-hold donations", () => {
    expect(storageCompatible("hot_hold", ["refrigerated", "ambient"])).toBe(false);
    expect(storageCompatible("hot_hold", ["hot_hold"])).toBe(true);
  });

  it("blocks NGOs that cannot accept the quantity", () => {
    const oversized: Donation = { ...donation, quantity: 500 };
    const ngo: NgoProfile = state.ngos.find((item) => item.id === "ngo-annapurna")!;
    const result = matchDonationToNgos(oversized, [ngo], state.needs, now)[0];
    expect(result.eligible).toBe(false);
    expect(result.hardFailures.join(" ")).toMatch(/quantity/i);
  });
});
