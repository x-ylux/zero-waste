"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useDemo } from "@/components/providers/DemoProvider";
import { suggestOnMyWay } from "@/lib/domain/engine";
import { FormEvent, useState } from "react";

export default function OnMyWayPage() {
  const { state, user, acceptTask } = useDemo();
  const vol = state.volunteers.find((item) => item.id === user.volunteerId);
  const [originAddress, setOriginAddress] = useState(vol?.location.address ?? "");
  const [originLat, setOriginLat] = useState(vol?.location.lat ?? 12.97);
  const [originLng, setOriginLng] = useState(vol?.location.lng ?? 77.59);
  const [destAddress, setDestAddress] = useState("MG Road Metro, Bengaluru");
  const [destLat, setDestLat] = useState(12.9756);
  const [destLng, setDestLng] = useState(77.6066);
  const [departure, setDeparture] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [maxDetour, setMaxDetour] = useState(25);
  const [results, setResults] = useState<ReturnType<typeof suggestOnMyWay>>([]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!vol) return;
    setResults(
      suggestOnMyWay(state, vol.id, {
        origin: { lat: originLat, lng: originLng, address: originAddress },
        destination: { lat: destLat, lng: destLng, address: destAddress },
        departureIso: new Date(departure).toISOString(),
        maxDetourMinutes: maxDetour,
      })
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <h1 className="text-2xl font-bold">On My Way</h1>
        <p className="text-sm text-warmgray-600">
          Suggest compatible pickups along a planned journey. In mock mode, travel-time estimates are simulated from straight-line distances — they are not live traffic ETAs.
        </p>
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-cream-200 bg-white p-5">
          <label className="block text-sm font-medium">
            Journey origin
            <input className="mt-1 w-full rounded-xl border px-3 py-2" value={originAddress} onChange={(e) => setOriginAddress(e.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="number" step="0.0001" className="rounded-xl border px-3 py-2" value={originLat} onChange={(e) => setOriginLat(Number(e.target.value))} />
            <input type="number" step="0.0001" className="rounded-xl border px-3 py-2" value={originLng} onChange={(e) => setOriginLng(Number(e.target.value))} />
          </div>
          <label className="block text-sm font-medium">
            Destination
            <input className="mt-1 w-full rounded-xl border px-3 py-2" value={destAddress} onChange={(e) => setDestAddress(e.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="number" step="0.0001" className="rounded-xl border px-3 py-2" value={destLat} onChange={(e) => setDestLat(Number(e.target.value))} />
            <input type="number" step="0.0001" className="rounded-xl border px-3 py-2" value={destLng} onChange={(e) => setDestLng(Number(e.target.value))} />
          </div>
          <label className="text-sm font-medium">
            Departure time
            <input type="datetime-local" className="mt-1 w-full rounded-xl border px-3 py-2" value={departure} onChange={(e) => setDeparture(e.target.value)} />
          </label>
          <label className="text-sm font-medium">
            Maximum detour (minutes)
            <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2" value={maxDetour} onChange={(e) => setMaxDetour(Number(e.target.value))} />
          </label>
          <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white">
            Suggest pickups
          </button>
        </form>
        <ul className="space-y-3">
          {results.length === 0 ? (
            <li className="text-sm text-warmgray-600">No suggestions yet, or none fit the detour budget.</li>
          ) : (
            results.map((item) => (
              <li key={item.taskId} className="rounded-2xl border border-cream-200 bg-white p-4">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-warmgray-600">{item.reason}</p>
                <p className="text-xs text-amber-800">Simulated extra distance: {item.extraKm.toFixed(1)} km</p>
                <button type="button" className="mt-2 rounded-lg bg-brand-700 px-3 py-2 text-sm text-white" onClick={() => acceptTask(item.taskId)}>
                  Accept this pickup
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </AppShell>
  );
}
