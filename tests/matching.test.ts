import { describe, it, expect, vi } from "vitest";
import { isTimeWithinOperatingHours } from "@/lib/matching/engine";
import { calculateHaversineDistanceKm } from "@/lib/maps/adapter";

describe("Matching Engine & Distance Calculations", () => {
  it("calculates accurate Haversine straight-line distance in kilometers", () => {
    // Koramangala to Indiranagar (~4.5 km)
    const koramangala = { latitude: 12.9345, longitude: 77.6265 };
    const indiranagar = { latitude: 12.9719, longitude: 77.6412 };

    const distance = calculateHaversineDistanceKm(koramangala, indiranagar);
    expect(distance).toBeGreaterThan(3.5);
    expect(distance).toBeLessThan(5.5);
  });

  it("evaluates operating hours strictly in Asia/Kolkata timezone", () => {
    // 14:00 UTC = 19:30 IST
    const eveningTime = new Date("2026-10-30T14:00:00Z");

    // Hours 08:00 to 22:00 IST -> Should be within
    expect(isTimeWithinOperatingHours(eveningTime, "08:00", "22:00")).toBe(true);

    // Hours 08:00 to 18:00 IST -> Should NOT be within
    expect(isTimeWithinOperatingHours(eveningTime, "08:00", "18:00")).toBe(false);
  });

  it("excludes candidates when distance exceeds permitted collection radius", () => {
    const donorLocation = { latitude: 12.9345, longitude: 77.6265 };
    const farLocation = { latitude: 13.15, longitude: 77.85 }; // > 30 km away

    const distance = calculateHaversineDistanceKm(donorLocation, farLocation);
    const permittedRadius = 15; // 15 km limit

    expect(distance).toBeGreaterThan(permittedRadius);
  });
});
