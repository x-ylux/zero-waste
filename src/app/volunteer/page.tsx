"use client";

import { AppShell } from "@/components/layout/AppShell";
import { LocationBoard } from "@/components/maps/LocationBoard";
import { useDemo } from "@/components/providers/DemoProvider";
import { DonationStatusBadge, TaskStatusBadge } from "@/components/ui/StatusBadge";
import { formatKm, haversineKm, simulatedTravelMinutes } from "@/lib/domain/geo";
import { listCompatibleTasks } from "@/lib/domain/engine";
import { HANDLING_LABELS, TRANSPORT_LABELS, UNIT_LABELS } from "@/lib/domain/labels";
import type { HandlingRequirement, TransportType } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function VolunteerDashboardPage() {
  const { state, user, setUserId, acceptTask, cancelTask, simulateCancellation, confirmPickup, updateVolunteer } = useDemo();
  const vol = state.volunteers.find((item) => item.id === user.volunteerId);
  const [cancelReason, setCancelReason] = useState("Unexpected delay; cannot complete this run.");
  const compatible = vol ? listCompatibleTasks(state, vol.id) : [];
  const myTasks = state.tasks.filter((task) => task.volunteerId === vol?.id || (task.status === "backup_needed" && vol?.standby && compatible.some((item) => item.id === task.id)));
  const assigned = state.tasks.filter((task) => task.volunteerId === vol?.id && (task.status === "assigned" || task.status === "picked_up"));

  const routeItems = useMemo(() => {
    return assigned.flatMap((task) => {
      const donation = state.donations.find((item) => item.id === task.donationId);
      const ngo = state.ngos.find((item) => item.id === task.ngoId);
      if (!donation || !ngo) return [];
      return [
        { id: `${task.id}-d`, title: `Pickup: ${donation.title}`, point: donation.pickupLocation, subtitle: donation.pickupLocation.address },
        { id: `${task.id}-n`, title: `Drop: ${ngo.name}`, point: ngo.location, subtitle: ngo.location.address },
      ];
    });
  }, [assigned, state.donations, state.ngos]);

  if (!vol) {
    return (
      <AppShell>
        <p>Switch to a volunteer persona to use this dashboard.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-2xl font-bold">Volunteer dashboard</h1>
        <section className="grid gap-4 rounded-2xl border border-cream-200 bg-white p-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="font-semibold">Availability & capacity</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={vol.available} onChange={(e) => updateVolunteer({ available: e.target.checked })} />
              Available for pickups
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={vol.standby} onChange={(e) => updateVolunteer({ standby: e.target.checked })} />
              Available as standby volunteer
            </label>
            <label className="text-sm font-medium">
              Transport type
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={vol.transportType}
                onChange={(e) => updateVolunteer({ transportType: e.target.value as TransportType })}
              >
                {Object.entries(TRANSPORT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Carrying capacity ({UNIT_LABELS[vol.capacityUnit]})
              <input
                type="number"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={vol.carryingCapacity}
                onChange={(e) => updateVolunteer({ carryingCapacity: Number(e.target.value) })}
              />
            </label>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Handling capabilities</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(HANDLING_LABELS) as HandlingRequirement[]).map((key) => (
                <label key={key} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={vol.handlingCapabilities.includes(key)}
                    onChange={() => {
                      const next = vol.handlingCapabilities.includes(key)
                        ? vol.handlingCapabilities.filter((item) => item !== key)
                        : [...vol.handlingCapabilities, key];
                      updateVolunteer({ handlingCapabilities: next });
                    }}
                  />
                  {HANDLING_LABELS[key]}
                </label>
              ))}
            </div>
            <Link href="/volunteer/on-my-way" className="mt-4 inline-block text-sm font-medium text-brand-800">
              Open On My Way suggestions
            </Link>
          </fieldset>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Compatible pickup tasks</h2>
          {compatible.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-6 text-sm text-warmgray-600">No compatible unassigned or backup tasks right now.</p>
          ) : (
            compatible.map((task) => {
              const donation = state.donations.find((item) => item.id === task.donationId);
              const ngo = state.ngos.find((item) => item.id === task.ngoId);
              if (!donation || !ngo) return null;
              return (
                <article key={task.id} className="rounded-2xl border border-cream-200 bg-white p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{donation.title}</h3>
                      <p className="text-sm text-warmgray-600">
                        {donation.quantity} {UNIT_LABELS[donation.unit]} to {ngo.name}
                      </p>
                    </div>
                    <TaskStatusBadge status={task.status} />
                  </div>
                  <button type="button" className="mt-3 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => acceptTask(task.id)}>
                    Accept task
                  </button>
                </article>
              );
            })
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">My active assignment</h2>
          {assigned.length === 0 ? (
            <p className="text-sm text-warmgray-600">No active assignment.</p>
          ) : (
            assigned.map((task) => {
              const donation = state.donations.find((item) => item.id === task.donationId);
              const ngo = state.ngos.find((item) => item.id === task.ngoId);
              if (!donation || !ngo) return null;
              const km = haversineKm(donation.pickupLocation, ngo.location);
              return (
                <article key={task.id} className="space-y-3 rounded-2xl border border-cream-200 bg-white p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="font-semibold">{donation.title}</h3>
                    <div className="flex gap-2">
                      <DonationStatusBadge status={donation.status} />
                      <TaskStatusBadge status={task.status} />
                    </div>
                  </div>
                  <p className="text-sm">
                    Donor → NGO route (simulated): {formatKm(km)}, about {simulatedTravelMinutes(km)} minutes. Travel-time estimates are simulated, not live traffic.
                  </p>
                  <p className="text-xs text-warmgray-500">Pickup {formatDateTime(donation.pickupWindowStart)}–{formatDateTime(donation.pickupWindowEnd)}</p>
                  {task.status === "assigned" && (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="rounded-lg bg-brand-700 px-3 py-2 text-sm text-white" onClick={() => confirmPickup(task.id, "manual")}>
                        Confirm pickup (manual)
                      </button>
                      <button type="button" className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm" onClick={() => simulateCancellation(task.id)}>
                        Simulate volunteer cancellation
                      </button>
                      <form
                        className="flex flex-wrap gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          cancelTask(task.id, cancelReason);
                        }}
                      >
                        <input className="rounded-lg border px-2 py-2 text-sm" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                        <button type="submit" className="rounded-lg border px-3 py-2 text-sm">
                          Cancel with reason
                        </button>
                      </form>
                    </div>
                  )}
                  {task.status === "picked_up" && (
                    <p className="text-sm text-brand-800">Picked up. NGO must confirm accepted quantity before impact is counted.</p>
                  )}
                  <Link className="text-sm text-brand-800" href={`/qr/${donation.id}`}>
                    Open QR / manual handoff
                  </Link>
                </article>
              );
            })
          )}
        </section>

        {routeItems.length > 0 && <LocationBoard items={routeItems} origin={vol.location} />}

        {user.id === "user-vol-aarav" && (
          <button type="button" className="text-sm text-amber-900" onClick={() => setUserId("user-vol-priya")}>
            After Rescue Mode, continue as Priya Shah (standby)
          </button>
        )}
      </div>
    </AppShell>
  );
}
