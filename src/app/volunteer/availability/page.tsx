"use client";

import React, { useState, useEffect } from "react";
import { Truck, Shield, MapPin, CheckCircle2, AlertCircle } from "lucide-react";

export default function VolunteerAvailabilityPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const [isAvailable, setIsAvailable] = useState(true);
  const [maxCarryingCapacity, setMaxCarryingCapacity] = useState(70);
  const [capacityUnit, setCapacityUnit] = useState("SERVINGS");
  const [operatingRadiusKm, setOperatingRadiusKm] = useState(15);
  const [vehicleType, setVehicleType] = useState("TWO_WHEELER");
  const [latitude, setLatitude] = useState(12.935);
  const [longitude, setLongitude] = useState(77.625);

  useEffect(() => {
    fetch("/api/volunteer/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setIsAvailable(data.profile.isAvailable);
          setMaxCarryingCapacity(data.profile.maxCarryingCapacity);
          setCapacityUnit(data.profile.capacityUnit);
          setOperatingRadiusKm(data.profile.operatingRadiusKm);
          setVehicleType(data.profile.vehicleType);
          setLatitude(data.profile.latitude);
          setLongitude(data.profile.longitude);
        }
      })
      .catch((err) => console.error("Failed to load profile", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/volunteer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isAvailable,
          maxCarryingCapacity: Number(maxCarryingCapacity),
          capacityUnit,
          operatingRadiusKm: Number(operatingRadiusKm),
          vehicleType,
          latitude: Number(latitude),
          longitude: Number(longitude),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Update failed", error: true });
      } else {
        setMessage({ text: "Volunteer profile updated successfully!", error: false });
      }
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-warmgray-500">Loading profile...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      <div>
        <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
          Volunteer Runner Settings
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-warmgray-900 tracking-tight">
          Operating Profile & Carrying Capacity
        </h1>
        <p className="text-xs text-warmgray-600 mt-0.5">
          Surplus pickups and backup offers will only be dispatched if they match your operating radius and carrying capacity.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border ${
            message.error
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-2xl border border-warmgray-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-warmgray-100">
          <div>
            <h2 className="text-sm font-bold text-warmgray-900">Dispatcher Availability</h2>
            <p className="text-xs text-warmgray-500">Enable or disable receiving new pickup offers.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-warmgray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-warmgray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
              Vehicle Type
            </label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white font-medium"
            >
              <option value="TWO_WHEELER">Two-Wheeler (Motorcycle/Scooter)</option>
              <option value="FOUR_WHEELER">Four-Wheeler (Car/Van)</option>
              <option value="BICYCLE">Bicycle</option>
              <option value="ON_FOOT">On Foot</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
              Operating Radius (km)
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={operatingRadiusKm}
              onChange={(e) => setOperatingRadiusKm(parseFloat(e.target.value) || 1)}
              className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
              Max Carrying Capacity
            </label>
            <input
              type="number"
              min="1"
              value={maxCarryingCapacity}
              onChange={(e) => setMaxCarryingCapacity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
              Capacity Unit
            </label>
            <select
              value={capacityUnit}
              onChange={(e) => setCapacityUnit(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white font-bold"
            >
              <option value="SERVINGS">SERVINGS (Portions)</option>
              <option value="KG">KG (Kilograms)</option>
              <option value="PACKETS">PACKETS</option>
              <option value="BOXES">BOXES</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
              Base Latitude (Bengaluru)
            </label>
            <input
              type="number"
              step="0.0001"
              value={latitude}
              onChange={(e) => setLatitude(parseFloat(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
              Base Longitude (Bengaluru)
            </label>
            <input
              type="number"
              step="0.0001"
              value={longitude}
              onChange={(e) => setLongitude(parseFloat(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-mono text-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-sm font-bold shadow transition"
        >
          {saving ? "Saving Changes..." : "Save Operating Profile"}
        </button>
      </form>
    </div>
  );
}
