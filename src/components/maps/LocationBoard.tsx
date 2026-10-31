"use client";

import { formatKm, haversineKm } from "@/lib/domain/geo";
import type { GeoPoint } from "@/lib/domain/types";
import { MapPin, Navigation } from "lucide-react";
import { useMemo, useState } from "react";

interface LocationItem {
  id: string;
  title: string;
  subtitle?: string;
  point: GeoPoint;
}

function createProjector(points: Pick<GeoPoint, "lat" | "lng">[]) {
  if (points.length === 0) return () => ({ x: 50, y: 30 });

  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latPadding = Math.max((maxLat - minLat) * 0.12, 0.012);
  const lngPadding = Math.max((maxLng - minLng) * 0.12, 0.012);
  const latRange = maxLat - minLat + latPadding * 2;
  const lngRange = maxLng - minLng + lngPadding * 2;

  return (point: Pick<GeoPoint, "lat" | "lng">) => ({
    x: 5 + ((point.lng - minLng + lngPadding) / lngRange) * 90,
    y: 4 + ((maxLat + latPadding - point.lat) / latRange) * 52,
  });
}

export function LocationBoard({
  items,
  origin,
}: {
  items: LocationItem[];
  origin?: GeoPoint;
}) {
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const project = useMemo(
    () => createProjector([...items.map((item) => item.point), ...(origin ? [origin] : [])]),
    [items, origin]
  );

  const routes = useMemo(() => {
    if (!origin) return [];
    return items.slice(0, 8).map((item) => {
      const from = project(origin);
      const to = project(item.point);
      return { id: item.id, d: `M ${from.x} ${from.y} L ${to.x} ${to.y}` };
    });
  }, [items, origin, project]);

  return (
    <div className="overflow-hidden rounded-2xl border border-cream-200 bg-panel shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-200 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-warmgray-900">
          <MapPin className="h-4 w-4 text-brand-400" />
          {mapsKey ? "Map view" : "Schematic cluster map"}
        </div>
        <p className="text-xs text-warmgray-500">
          {mapsKey
            ? "Google Maps key detected — schematic still shown for reliability in demo mode."
            : "No Maps API key — visual fallback with straight-line distances (simulated)."}
        </p>
      </div>

      <div className="relative h-80 w-full overflow-hidden bg-cream-100 map-grid">
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img" aria-label="Schematic map of the listed Bengaluru locations">
          <defs>
            <linearGradient id="routeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          {/* Soft district blobs */}
          <ellipse cx="42" cy="32" rx="18" ry="8" fill="rgba(52,211,153,0.08)" />
          <ellipse cx="62" cy="23" rx="14" ry="7" fill="rgba(52,211,153,0.06)" />
          <ellipse cx="78" cy="28" rx="10" ry="6" fill="rgba(245,158,11,0.07)" />
          {/* Arterial roads */}
          <path d="M 8 42 C 30 39, 45 33, 55 25 C 62 20, 78 16, 94 18" fill="none" stroke="rgba(122,144,134,0.45)" strokeWidth="0.6" />
          <path d="M 12 10 C 28 20, 40 32, 48 44 C 52 50, 60 53, 74 52" fill="none" stroke="rgba(122,144,134,0.4)" strokeWidth="0.5" />
          <path d="M 5 30 H 95" fill="none" stroke="rgba(122,144,134,0.28)" strokeWidth="0.4" strokeDasharray="1.5 1.2" />
          <path d="M 50 4 V 56" fill="none" stroke="rgba(122,144,134,0.28)" strokeWidth="0.4" strokeDasharray="1.5 1.2" />
          {routes.map((route) => (
            <path key={route.id} d={route.d} fill="none" stroke="url(#routeGlow)" strokeWidth="0.45" strokeDasharray="1.2 0.8" opacity={selected?.id === route.id ? 1 : 0.35} />
          ))}
          {origin && (
            <g>
              <circle cx={project(origin).x} cy={project(origin).y} r="2.2" fill="#f59e0b" opacity="0.9" />
              <circle cx={project(origin).x} cy={project(origin).y} r="3.4" fill="none" stroke="#f59e0b" strokeWidth="0.35" opacity="0.7" />
            </g>
          )}
        </svg>
        {items.map((item, index) => {
          const point = project(item.point);
          const active = selected?.id === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              aria-label={`Select location ${index + 1}: ${item.title}`}
              aria-pressed={active}
              title={item.title}
              style={{ left: `${point.x}%`, top: `${(point.y / 60) * 100}%` }}
              className={`absolute z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow-lg transition ${
                active
                  ? "border-white bg-brand-500 text-brand-950 ring-4 ring-brand-400/30"
                  : "border-white bg-brand-700 text-white hover:scale-110"
              }`}
            >
              {index + 1}
            </button>
          );
        })}
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-cream-200/80 bg-panel/90 px-2.5 py-1.5 text-[11px] text-warmgray-600 backdrop-blur">
          Bengaluru demo cluster · schematic projection
        </div>
        {origin && (
          <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-panel/90 px-2.5 py-1.5 text-[11px] text-warmgray-900 backdrop-blur">
            <Navigation className="h-3 w-3" />
            Amber pin = your filter origin
          </div>
        )}
      </div>

      {selected && (
        <div className="border-b border-cream-200 bg-panel-raised px-4 py-3">
          <p className="text-sm font-semibold text-warmgray-900">{selected.title}</p>
          {selected.subtitle && <p className="text-xs text-warmgray-600">{selected.subtitle}</p>}
          <p className="mt-1 text-sm text-warmgray-700">{selected.point.address}</p>
          <p className="text-xs text-warmgray-500">
            {selected.point.lat.toFixed(4)}, {selected.point.lng.toFixed(4)}
            {origin ? ` · ${formatKm(haversineKm(origin, selected.point))} straight-line (simulated)` : ""}
          </p>
        </div>
      )}

      <ul className="max-h-56 space-y-2 overflow-y-auto p-3">
        {items.length === 0 ? (
          <li className="rounded-xl border border-dashed border-cream-300 px-3 py-6 text-center text-sm text-warmgray-600">
            No locations to plot for the current filters.
          </li>
        ) : (
          items.map((item, index) => {
            const distance = origin ? formatKm(haversineKm(origin, item.point)) : null;
            const active = selected?.id === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-brand-400 bg-brand-50"
                      : "border-cream-200 bg-cream-50 hover:border-brand-300"
                  }`}
                >
                  <p className="font-medium text-warmgray-900">
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] text-white">
                      {index + 1}
                    </span>
                    {item.title}
                  </p>
                  {item.subtitle && <p className="mt-1 text-xs text-warmgray-600">{item.subtitle}</p>}
                  <p className="mt-1 text-sm text-warmgray-700">{item.point.address}</p>
                  <p className="text-xs text-warmgray-500">
                    {item.point.lat.toFixed(4)}, {item.point.lng.toFixed(4)}
                    {distance ? ` · ${distance} from origin` : ""}
                  </p>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
