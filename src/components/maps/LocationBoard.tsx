"use client";

import Script from "next/script";
import { formatKm, haversineKm } from "@/lib/domain/geo";
import type { GeoPoint } from "@/lib/domain/types";
import { LocateFixed, MapPin, Navigation } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

function locationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. Allow location access in your browser settings, then try again.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Your device could not determine its location. Check location services and try again.";
  }
  return "The location request timed out. Please try again.";
}

export function LocationBoard({
  items,
  origin,
}: {
  items: LocationItem[];
  origin?: GeoPoint;
}) {
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState("");
  const [deviceOrigin, setDeviceOrigin] = useState<GeoPoint | undefined>();
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const activeOrigin = deviceOrigin ?? origin;
  const project = useMemo(
    () => createProjector([...items.map((item) => item.point), ...(activeOrigin ? [activeOrigin] : [])]),
    [items, activeOrigin]
  );
  const routes = useMemo(() => {
    if (!activeOrigin) return [];
    return items.slice(0, 8).map((item) => {
      const from = project(activeOrigin);
      const to = project(item.point);
      return { id: item.id, d: `M ${from.x} ${from.y} L ${to.x} ${to.y}` };
    });
  }, [activeOrigin, items, project]);
  const handleMapsReady = useCallback(() => setMapsReady(true), []);

  function requestLocation() {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationMessage("This browser does not support device location.");
      return;
    }

    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeviceOrigin({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: "Your device location",
        });
        setLocationMessage("Location access granted for this view. RescueRelay does not store your device location.");
        setLocationBusy(false);
      },
      (error) => {
        setLocationMessage(locationErrorMessage(error));
        setLocationBusy(false);
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 12_000 }
    );
  }

  useEffect(() => {
    if (!mapsKey || !mapsReady || mapsError || !mapElement.current || !window.google?.maps) return;

    try {
      const maps = window.google.maps;
      const center = activeOrigin ?? (items[0]?.point ?? { lat: 12.9716, lng: 77.5946 });
      const map =
        mapInstance.current ??
        new maps.Map(mapElement.current, {
          center,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });
      mapInstance.current = map;

      const bounds = new maps.LatLngBounds();
      items.forEach((item) => bounds.extend(item.point));
      if (activeOrigin) bounds.extend(activeOrigin);
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, 40);
        if (items.length === 1 && !activeOrigin) map.setZoom(14);
      }

      markers.current.forEach((marker) => marker.setMap(null));
      markers.current = items.map((item, index) => {
        const marker = new maps.Marker({
          map,
          position: item.point,
          title: item.title,
          label: String(index + 1),
        });
        marker.addListener("click", () => setSelectedId(item.id));
        return marker;
      });

      if (activeOrigin) {
        markers.current.push(
          new maps.Marker({
            map,
            position: activeOrigin,
            title: "Your location",
            icon: {
              path: maps.SymbolPath.CIRCLE,
              fillColor: "#f59e0b",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: 8,
            },
            zIndex: 1000,
          })
        );
      }
    } catch (error) {
      console.error("Could not initialize Google Maps.", error);
      setMapsError("Google Maps could not be initialized. The schematic map is shown instead.");
    }
  }, [activeOrigin, items, mapsError, mapsKey, mapsReady]);

  useEffect(() => {
    if (selected) mapInstance.current?.panTo(selected.point);
  }, [selected]);

  useEffect(
    () => () => {
      markers.current.forEach((marker) => marker.setMap(null));
      mapInstance.current = null;
    },
    []
  );

  const showGoogleMap = Boolean(mapsKey && mapsReady && !mapsError);

  return (
    <div className="overflow-hidden rounded-2xl border border-cream-200 bg-panel shadow-panel">
      {mapsKey && (
        <Script
          id="google-maps-javascript-api"
          src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsKey)}&v=weekly`}
          strategy="afterInteractive"
          onReady={handleMapsReady}
          onError={() => setMapsError("Google Maps failed to load. Check the API key and Maps JavaScript API settings.")}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream-200 px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-warmgray-900">
            <MapPin className="h-4 w-4 text-brand-700" />
            {showGoogleMap ? "Google Maps" : mapsKey ? "Loading Google Maps" : "Schematic map"}
          </div>
          <p className="mt-1 text-xs text-warmgray-500">
            {mapsError || (mapsKey
              ? "Real road map with selectable food locations."
              : "Add a restricted Google Maps API key to enable the real road map.")}
          </p>
        </div>
        <button
          type="button"
          onClick={requestLocation}
          disabled={locationBusy}
          className="inline-flex items-center gap-2 rounded-xl border border-cream-300 bg-panel-raised px-3 py-2 text-sm font-semibold text-warmgray-800 hover:border-brand-400 disabled:cursor-wait disabled:opacity-60"
        >
          <LocateFixed className="h-4 w-4" />
          {locationBusy ? "Finding location…" : deviceOrigin ? "Refresh my location" : "Use my location"}
        </button>
      </div>
      {locationMessage && (
        <p role="status" className="border-b border-cream-200 bg-panel-raised px-4 py-2 text-xs text-warmgray-700">
          {locationMessage}
        </p>
      )}
      <p className="border-b border-cream-200 bg-panel-raised px-4 py-2 text-xs text-warmgray-600">
        Location is requested only after you click the button. RescueRelay does not store it; when Google Maps is configured, Google receives it to render the map.
      </p>

      <div className="relative h-80 w-full overflow-hidden bg-cream-100">
        {showGoogleMap ? (
          <div ref={mapElement} className="h-full w-full" aria-label="Google map of food rescue locations" />
        ) : (
          <div className="relative h-full w-full map-grid" role="img" aria-label="Schematic map of the listed food locations">
            <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
              <defs>
                <linearGradient id="routeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.35" />
                </linearGradient>
              </defs>
              <ellipse cx="42" cy="32" rx="18" ry="8" fill="rgba(52,211,153,0.08)" />
              <ellipse cx="62" cy="23" rx="14" ry="7" fill="rgba(52,211,153,0.06)" />
              <ellipse cx="78" cy="28" rx="10" ry="6" fill="rgba(245,158,11,0.07)" />
              <path d="M 8 42 C 30 39, 45 33, 55 25 C 62 20, 78 16, 94 18" fill="none" stroke="rgba(122,144,134,0.45)" strokeWidth="0.6" />
              <path d="M 12 10 C 28 20, 40 32, 48 44 C 52 50, 60 53, 74 52" fill="none" stroke="rgba(122,144,134,0.4)" strokeWidth="0.5" />
              <path d="M 5 30 H 95" fill="none" stroke="rgba(122,144,134,0.28)" strokeWidth="0.4" strokeDasharray="1.5 1.2" />
              <path d="M 50 4 V 56" fill="none" stroke="rgba(122,144,134,0.28)" strokeWidth="0.4" strokeDasharray="1.5 1.2" />
              {routes.map((route) => (
                <path key={route.id} d={route.d} fill="none" stroke="url(#routeGlow)" strokeWidth="0.45" strokeDasharray="1.2 0.8" opacity={selected?.id === route.id ? 1 : 0.35} />
              ))}
              {activeOrigin && (
                <g>
                  <circle cx={project(activeOrigin).x} cy={project(activeOrigin).y} r="2.2" fill="#f59e0b" opacity="0.9" />
                  <circle cx={project(activeOrigin).x} cy={project(activeOrigin).y} r="3.4" fill="none" stroke="#f59e0b" strokeWidth="0.35" opacity="0.7" />
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
              Location schematic · not a road map
            </div>
            {activeOrigin && (
              <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-panel/90 px-2.5 py-1.5 text-[11px] text-warmgray-900 backdrop-blur">
                <Navigation className="h-3 w-3" />
                Amber marker = {deviceOrigin ? "your device location" : "map origin"}
              </div>
            )}
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
            {activeOrigin ? ` · ${formatKm(haversineKm(activeOrigin, selected.point))} straight-line (estimate)` : ""}
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
            const distance = activeOrigin ? formatKm(haversineKm(activeOrigin, item.point)) : null;
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
                    {distance ? ` · ${distance} straight-line from location` : ""}
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
