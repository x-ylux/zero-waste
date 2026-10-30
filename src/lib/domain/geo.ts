import type { GeoPoint } from "@/lib/domain/types";

const EARTH_RADIUS_KM = 6371;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(a: Pick<GeoPoint, "lat" | "lng">, b: Pick<GeoPoint, "lat" | "lng">): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Simulated urban travel: ~22 km/h average. Labeled as mock in the UI. */
export function simulatedTravelMinutes(distanceKm: number): number {
  return Math.max(4, Math.round((distanceKm / 22) * 60));
}

export function formatKm(distanceKm: number): string {
  return `${distanceKm.toFixed(1)} km`;
}
