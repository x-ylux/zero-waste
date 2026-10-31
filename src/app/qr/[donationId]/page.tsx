"use client";

import { PickupCountdown } from "@/components/donations/PickupCountdown";
import { useDemo } from "@/components/providers/DemoProvider";
import { QrPanel } from "@/components/qr/QrPanel";
import { DonationStatusBadge } from "@/components/ui/StatusBadge";
import { ALLERGEN_LABELS, CATEGORY_LABELS, STORAGE_LABELS, UNIT_LABELS } from "@/lib/domain/labels";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function QrHandoffPage() {
  const params = useParams<{ donationId: string }>();
  const { state, user, confirmPickup, confirmReceipt } = useDemo();
  const donation = state.donations.find((item) => item.id === params.donationId);
  const task = state.tasks.find((item) => item.donationId === params.donationId && item.status !== "cancelled");
  const handoffs = state.handoffs.filter((item) => item.donationId === params.donationId);
  const [accepted, setAccepted] = useState(donation?.quantity ?? 0);
  const publicUrl = useMemo(() => `/qr/${params.donationId}`, [params.donationId]);

  if (!donation) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p>Passport not found.</p>
        <Link href="/">Home</Link>
      </div>
    );
  }

  const canPickup =
    user.role === "volunteer" &&
    Boolean(task) &&
    task?.volunteerId === user.volunteerId &&
    task?.status === "assigned";
  const canReceipt = user.role === "ngo" && donation.reservedNgoId === user.orgId && donation.status === "collected";

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <Link href="/" className="text-sm text-brand-800">
        RescueRelay
      </Link>
      <div className="rounded-3xl border border-cream-200 bg-white p-5 shadow-sm">
        <div className="flex justify-between gap-3">
          <div>
            <p className="text-xs uppercase text-warmgray-500">QR handoff passport</p>
            <h1 className="text-xl font-bold">{donation.title}</h1>
            <p className="text-sm text-warmgray-600">Donation ID {donation.id}</p>
          </div>
          <DonationStatusBadge status={donation.status} />
        </div>
        <div className="mt-4 flex justify-center">
          <QrPanel value={publicUrl} />
        </div>
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950">
          This QR code and handoff record are operational identifiers only. They do not certify food safety, hygiene, or nutritional adequacy.
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="text-xs text-warmgray-500">Food description</dt>
            <dd>
              {donation.description} · {CATEGORY_LABELS[donation.category]} · {donation.quantity} {UNIT_LABELS[donation.unit]}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-warmgray-500">Donor-declared handling</dt>
            <dd>{STORAGE_LABELS[donation.storage]} · {donation.handlingRequirements.join(", ") || "none listed"}</dd>
          </div>
          <div>
            <dt className="text-xs text-warmgray-500">Donor-declared allergens</dt>
            <dd>{donation.allergens.map((item) => ALLERGEN_LABELS[item]).join(", ")}</dd>
          </div>
          <div>
            <dt className="text-xs text-warmgray-500">Pickup deadline</dt>
            <dd>{formatDateTime(donation.pickupWindowEnd)}</dd>
          </div>
        </dl>
        <div className="mt-3">
          <PickupCountdown deadline={donation.pickupWindowEnd} />
        </div>
        <section className="mt-4">
          <h2 className="font-semibold">Pickup and receipt records</h2>
          {handoffs.length === 0 ? (
            <p className="text-sm text-warmgray-600">No handoff events yet.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {handoffs.map((event) => (
                <li key={event.id} className="rounded-xl bg-cream-50 px-3 py-2">
                  {event.stage} · {event.method} · {event.quantity ?? "n/a"} {UNIT_LABELS[donation.unit]} · {formatDateTime(event.createdAt)}
                </li>
              ))}
            </ul>
          )}
        </section>
        {canPickup && task && (
          <button
            type="button"
            className="mt-4 w-full rounded-xl bg-brand-700 py-2 text-sm font-semibold text-white"
            onClick={() => confirmPickup(task.id, "qr")}
          >
            Confirm pickup via QR
          </button>
        )}
        {user.role === "volunteer" && task && task.status === "assigned" && (
          <button
            type="button"
            className="mt-2 w-full rounded-xl border py-2 text-sm"
            onClick={() => confirmPickup(task.id, "manual")}
          >
            Manual confirmation fallback
          </button>
        )}
        {canReceipt && (
          <form
            className="mt-4 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              confirmReceipt(donation.id, accepted);
            }}
          >
            <label className="text-sm font-medium">
              Accepted quantity
              <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2" value={accepted} onChange={(e) => setAccepted(Number(e.target.value))} />
            </label>
            <button type="submit" className="w-full rounded-xl bg-brand-700 py-2 text-sm font-semibold text-white">
              Confirm receipt
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
