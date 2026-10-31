"use client";

import { PickupCountdown } from "@/components/donations/PickupCountdown";
import { AppShell } from "@/components/layout/AppShell";
import { useDemo } from "@/components/providers/DemoProvider";
import { DonationStatusBadge, TaskStatusBadge } from "@/components/ui/StatusBadge";
import { matchesForDonation } from "@/lib/domain/engine";
import { ALLERGEN_LABELS, CATEGORY_LABELS, UNIT_LABELS } from "@/lib/domain/labels";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function DonationDetailPage() {
  const params = useParams<{ id: string }>();
  const { state, cancelDonation } = useDemo();
  const donation = state.donations.find((item) => item.id === params.id);
  const [reason, setReason] = useState("Listed in error / surplus no longer available.");
  if (!donation) {
    return (
      <AppShell>
        <p>Donation not found.</p>
      </AppShell>
    );
  }
  const ngo = state.ngos.find((item) => item.id === donation.reservedNgoId);
  const task = state.tasks.find((item) => item.donationId === donation.id);
  const events = state.timeline.filter((item) => item.donationId === donation.id);
  const matches = matchesForDonation(state, donation.id);
  const canCancel = donation.status === "available" || donation.status === "reserved";

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{donation.title}</h1>
            <p className="text-sm text-warmgray-600">{donation.description}</p>
          </div>
          <DonationStatusBadge status={donation.status} />
        </div>
        {donation.animalShelterOnly && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            This listing is designated for animal shelters only. Suitability is donor-declared, not independently verified.
          </p>
        )}
        <PickupCountdown deadline={donation.pickupWindowEnd} />
        <dl className="grid gap-3 rounded-2xl border border-cream-200 bg-white p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-warmgray-500">Quantity</dt>
            <dd>
              {donation.quantity} {UNIT_LABELS[donation.unit]} · {CATEGORY_LABELS[donation.category]}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-warmgray-500">Assigned recipient</dt>
            <dd>{ngo?.name ?? "None yet"}</dd>
          </div>
          <div>
            <dt className="text-xs text-warmgray-500">Allergens (donor-declared)</dt>
            <dd>{donation.allergens.map((item) => ALLERGEN_LABELS[item]).join(", ")}</dd>
          </div>
          <div>
            <dt className="text-xs text-warmgray-500">Pickup window</dt>
            <dd>
              {formatDateTime(donation.pickupWindowStart)} – {formatDateTime(donation.pickupWindowEnd)}
            </dd>
          </div>
        </dl>
        {task && (
          <p className="text-sm">
            Rescue task: <TaskStatusBadge status={task.status} />
          </p>
        )}
        <section className="rounded-2xl border border-cream-200 bg-white p-4">
          <h2 className="font-semibold">Handoff timeline</h2>
          {events.length === 0 ? (
            <p className="mt-2 text-sm text-warmgray-600">No events yet.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {events.map((event) => (
                <li key={event.id} className="border-l-2 border-brand-300 pl-3">
                  <p className="text-sm font-medium">{event.label}</p>
                  <p className="text-sm text-warmgray-600">{event.detail}</p>
                  <p className="text-xs text-warmgray-500">{formatDateTime(event.createdAt)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="rounded-2xl border border-cream-200 bg-white p-4">
          <h2 className="font-semibold">Current NGO match preview</h2>
          <ul className="mt-3 space-y-2">
            {matches.slice(0, 4).map((match) => (
              <li key={match.ngoId} className="text-sm">
                <span className="font-medium">{match.ngoName}</span>: {match.reason}
              </li>
            ))}
          </ul>
        </section>
        <p>
          <Link className="text-sm font-medium text-brand-800" href={`/qr/${donation.id}`}>
            Open QR handoff passport
          </Link>
        </p>
        {canCancel && (
          <form
            className="space-y-3 rounded-2xl border border-rose-100 bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              cancelDonation(donation.id, reason);
            }}
          >
            <h2 className="font-semibold">Cancel listing</h2>
            <textarea className="w-full rounded-xl border border-cream-300 px-3 py-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button type="submit" className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white">
              Cancel donation
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
