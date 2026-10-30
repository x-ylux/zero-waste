"use client";

import React, { useState } from "react";
import { MapPin, Navigation, List, Map, Info, Compass } from "lucide-react";

export interface MapEntity {
  id: string;
  name: string;
  type: "DONOR" | "NGO" | "VOLUNTEER";
  latitude: number;
  longitude: number;
  address?: string;
  radiusKm?: number;
  eligible?: boolean;
  score?: number;
}

interface DiscoveryMapProps {
  center: { latitude: number; longitude: number };
  donor: MapEntity;
  candidates: MapEntity[];
  onSelectCandidate?: (candidate: MapEntity) => void;
}

export function DiscoveryMap({
  center,
  donor,
  candidates,
  onSelectCandidate,
}: DiscoveryMapProps) {
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [selectedEntity, setSelectedEntity] = useState<MapEntity | null>(candidates[0] || null);

  // Bengaluru bounding box mapping:
  // Lat: ~12.88 to 13.04 (delta ~0.16)
  // Lng: ~77.52 to 77.72 (delta ~0.20)
  const minLat = 12.88;
  const maxLat = 13.04;
  const minLng = 77.52;
  const maxLng = 77.72;

  const projectToSvg = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * 100;
    return {
      x: Math.min(95, Math.max(5, x)),
      y: Math.min(95, Math.max(5, y)),
    };
  };

  const donorPos = projectToSvg(donor.latitude, donor.longitude);

  return (
    <div className="bg-white rounded-xl border border-warmgray-200 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-warmgray-200 bg-cream-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-brand-700" />
          <div>
            <h4 className="font-bold text-sm text-warmgray-900">
              Proximity & Route Radar (Bengaluru Zone)
            </h4>
            <p className="text-[11px] text-warmgray-500">
              Straight-line demonstration adapter • Haversine distance model
            </p>
          </div>
        </div>

        <div className="flex items-center bg-white border border-warmgray-200 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setViewMode("map")}
            className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition ${
              viewMode === "map"
                ? "bg-brand-700 text-white font-semibold"
                : "text-warmgray-600 hover:bg-warmgray-100"
            }`}
          >
            <Map className="w-3.5 h-3.5" /> Map View
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition ${
              viewMode === "list"
                ? "bg-brand-700 text-white font-semibold"
                : "text-warmgray-600 hover:bg-warmgray-100"
            }`}
          >
            <List className="w-3.5 h-3.5" /> List Fallback
          </button>
        </div>
      </div>

      {viewMode === "map" ? (
        <div className="relative">
          {/* Map canvas visual */}
          <div className="relative w-full h-80 bg-warmgray-100 overflow-hidden border-b border-warmgray-200">
            {/* Grid Lines */}
            <svg className="w-full h-full absolute inset-0">
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e5e7eb" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Connecting lines from donor to candidates */}
              {candidates.map((c) => {
                const pos = projectToSvg(c.latitude, c.longitude);
                return (
                  <line
                    key={c.id}
                    x1={`${donorPos.x}%`}
                    y1={`${donorPos.y}%`}
                    x2={`${pos.x}%`}
                    y2={`${pos.y}%`}
                    stroke={c.eligible ? "#16a34a" : "#cbd5e1"}
                    strokeWidth={selectedEntity?.id === c.id ? 2.5 : 1.5}
                    strokeDasharray={c.eligible ? "none" : "4,4"}
                  />
                );
              })}
            </svg>

            {/* Donor Pin */}
            <div
              style={{ left: `${donorPos.x}%`, top: `${donorPos.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-brand-800 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-brand-500/50">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="absolute left-1/2 -translate-x-1/2 top-9 px-2 py-0.5 bg-warmgray-900 text-white text-[10px] font-bold rounded shadow whitespace-nowrap">
                {donor.name} (Pickup)
              </span>
            </div>

            {/* Candidate Pins */}
            {candidates.map((c) => {
              const pos = projectToSvg(c.latitude, c.longitude);
              const isSelected = selectedEntity?.id === c.id;

              return (
                <div
                  key={c.id}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  onClick={() => {
                    setSelectedEntity(c);
                    if (onSelectCandidate) onSelectCandidate(c);
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer transition transform hover:scale-110"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md border-2 border-white ${
                      c.eligible
                        ? isSelected
                          ? "bg-emerald-600 text-white ring-4 ring-emerald-300"
                          : "bg-emerald-500 text-white"
                        : "bg-warmgray-400 text-white opacity-70"
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={`absolute left-1/2 -translate-x-1/2 top-8 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap shadow-sm ${
                      c.eligible ? "bg-white text-emerald-950 border border-emerald-200" : "bg-warmgray-100 text-warmgray-600"
                    }`}
                  >
                    {c.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Selected Candidate Info Card */}
          {selectedEntity && (
            <div className="p-4 bg-white flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-warmgray-900 text-sm">
                  {selectedEntity.name}
                </span>
                <p className="text-warmgray-600 mt-0.5">{selectedEntity.address}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                      selectedEntity.eligible
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        : "bg-rose-100 text-rose-900 border border-rose-300"
                    }`}
                  >
                    {selectedEntity.eligible ? "Eligible Match" : "Ineligible"}
                  </span>
                  {selectedEntity.radiusKm && (
                    <span className="text-warmgray-500">
                      Collection radius: {selectedEntity.radiusKm} km
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-warmgray-500 block">
                  Simulated Demonstration Radius
                </span>
                <span className="text-emerald-700 font-bold text-sm">
                  {selectedEntity.score ? `Match Score: ${selectedEntity.score}` : "Evaluated"}
                </span>
              </div>
            </div>
          )}

          <div className="px-4 py-2 bg-amber-50 text-amber-900 text-[11px] border-t border-amber-200 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 flex-shrink-0 text-amber-700" />
            <span>
              Route estimates use straight-line Euclidean/Haversine distance models for demonstration. Not live traffic-aware ETAs.
            </span>
          </div>
        </div>
      ) : (
        /* List Fallback View */
        <div className="divide-y divide-warmgray-200">
          {candidates.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                setSelectedEntity(c);
                if (onSelectCandidate) onSelectCandidate(c);
              }}
              className="p-4 hover:bg-cream-50 transition cursor-pointer flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-warmgray-900 text-sm">{c.name}</span>
                <p className="text-xs text-warmgray-600">{c.address}</p>
                <span
                  className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                    c.eligible
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-rose-100 text-rose-900"
                  }`}
                >
                  {c.eligible ? "Eligible" : "Ineligible"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-warmgray-800">
                  Radius: {c.radiusKm || 10} km
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
