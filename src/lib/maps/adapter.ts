export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface RouteEstimate {
  distanceKm: number;
  estimatedMinutes: number;
  provider: "google_routes" | "straight_line_demonstration";
  isSimulatedFallback: boolean;
  disclaimer: string;
}

export interface IMapAdapter {
  calculateDistance(from: GeoCoordinates, to: GeoCoordinates): number;
  getRouteEstimate(from: GeoCoordinates, to: GeoCoordinates): Promise<RouteEstimate>;
}

/**
 * Calculates great-circle distance between two points on the earth using the Haversine formula.
 * Returns distance in kilometers.
 */
export function calculateHaversineDistanceKm(
  from: GeoCoordinates,
  to: GeoCoordinates
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 100) / 100;
}

export class MapAdapter implements IMapAdapter {
  private googleApiKey: string | undefined;

  constructor() {
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
  }

  calculateDistance(from: GeoCoordinates, to: GeoCoordinates): number {
    return calculateHaversineDistanceKm(from, to);
  }

  async getRouteEstimate(
    from: GeoCoordinates,
    to: GeoCoordinates
  ): Promise<RouteEstimate> {
    const distanceKm = this.calculateDistance(from, to);

    // If Google Maps API Key is provided, we can fetch real directions
    if (this.googleApiKey && this.googleApiKey.trim().length > 0) {
      try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${from.latitude},${from.longitude}&destinations=${to.latitude},${to.longitude}&key=${this.googleApiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.rows?.[0]?.elements?.[0]?.status === "OK") {
          const element = data.rows[0].elements[0];
          const distKm = Math.round((element.distance.value / 1000) * 10) / 10;
          const mins = Math.ceil(element.duration.value / 60);
          return {
            distanceKm: distKm,
            estimatedMinutes: mins,
            provider: "google_routes",
            isSimulatedFallback: false,
            disclaimer: "Live Google Maps route estimate.",
          };
        }
      } catch {
        // Fallback to straight-line demonstration if remote request fails
      }
    }

    // Deterministic straight-line fallback estimate (demonstration only, urban 20 km/h average)
    const estimatedMinutes = Math.max(5, Math.ceil((distanceKm / 20) * 60));

    return {
      distanceKm,
      estimatedMinutes,
      provider: "straight_line_demonstration",
      isSimulatedFallback: true,
      disclaimer:
        "Simulated straight-line distance (demonstration only; not live traffic-aware).",
    };
  }
}

export const mapAdapter = new MapAdapter();

