"use client";

import { formatKm, haversineKm } from "@/lib/domain/geo";
import type { GeoPoint } from "@/lib/domain/types";
import { MapPin } from "lucide-react";
import { useEffect, useRef } from "react";

interface LocationItem {
  id: string;
  title: string;
  subtitle?: string;
  point: GeoPoint;
}

export function LocationBoard({
  items,
  origin,
}: {
  items: LocationItem[];
  origin?: GeoPoint;
}) {
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapsKey || !mapRef.current || items.length === 0) return;
    const w = window as Window & {
      google?: {
        maps: {
          Map: new (el: HTMLElement, opts: Record<string, unknown>) => unknown;
          Marker: new (opts: Record<string, unknown>) => unknown;
        };
      };
    };
    const start = () => {
      if (!w.google?.maps || !mapRef.current) return;
      const map = new w.google.maps.Map(mapRef.current, {
        center: origin ?? items[0].point,
        zoom: 12,
        mapTypeControl: false,
      });
      items.forEach((item) => {
        new w.google.maps.Marker({
          map,
          position: item.point,
          title: item.title,
        });
      });
    };
    if (w.google?.maps) {
      start();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}`;
    script.async = true;
    script.onload = start;
    document.body.appendChild(script);
  }, [items, mapsKey, origin]);

  if (mapsKey) {
    return (
      <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm">
        <div ref={mapRef} className="h-80 w-full" />
        <p className="border-t border-cream-100 px-4 py-2 text-xs text-warmgray-500">
          Map view uses the public Google Maps browser key. Routes are still approximate.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-warmgray-900">
        <MapPin className="h-4 w-4 text-brand-700" />
        Location list (map fallback)
      </div>
      <p className="mb-4 text-xs text-warmgray-600">
        Google Maps API key is not configured. Showing an accessible location list instead of a blank map.
      </p>
      <ul className="space-y-3">
        {items.map((item) => {
          const distance = origin ? formatKm(haversineKm(origin, item.point)) : null;
          return (
            <li key={item.id} className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-3">
              <p className="font-medium text-warmgray-900">{item.title}</p>
              {item.subtitle && <p className="text-xs text-warmgray-600">{item.subtitle}</p>}
              <p className="mt-1 text-sm text-warmgray-700">{item.point.address}</p>
              <p className="text-xs text-warmgray-500">
                {item.point.lat.toFixed(4)}, {item.point.lng.toFixed(4)}
                {distance ? ` · ${distance} from filter origin (straight-line)` : ""}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
