"use client";

import { PickupCountdown } from "@/components/donations/PickupCountdown";
import { AppShell } from "@/components/layout/AppShell";
import { useDemo } from "@/components/providers/DemoProvider";
import { DonationStatusBadge } from "@/components/ui/StatusBadge";
import { calculateImpact } from "@/lib/domain/impact";
import { UNIT_LABELS } from "@/lib/domain/labels";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";

export default function DonorDashboardPage() {
  const { state, user } = useDemo();
  const mine = state.donations.filter((item) => item.donorOrgId === user.orgId);
  const impact = calculateImpact(mine);
  const active = mine.filter((item) => item.status === "available" || item.status === "reserved" || item.status === "collected");
  const completed = mine.filter((item) => item.status === "delivered");

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Donor dashboard</h1>
            <p className="text-sm text-warmgray-600">List surplus, track handoffs, and cancel only while food is still recoverable.</p>
          </div>
          <Link href="/donor/new" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
            Create donation
          </Link>
        </div>
        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-warmgray-500">Active listings</p>
            <p className="text-3xl font-bold text-brand-800">{active.length}</p>
          </article>
          <article className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-warmgray-500">Completed donations</p>
            <p className="text-3xl font-bold text-brand-800">{completed.length}</p>
          </article>
          <article className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-warmgray-500">Food accepted (by unit)</p>
            <p className="text-sm font-semibold text-brand-800">
              {impact.acceptedByUnit.servings} servings · {impact.acceptedByUnit.kg} kg
            </p>
            <p className="text-xs text-warmgray-500">Illustrative estimate — accepted quantity only</p>
          </article>
        </section>
        <section className="space-y-3">
          {mine.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-cream-300 bg-white p-8 text-center text-sm text-warmgray-600">
              No listings yet. Create a donation to start matching.
            </p>
          ) : (
            mine.map((donation) => {
              const ngo = state.ngos.find((item) => item.id === donation.reservedNgoId);
              return (
                <Link
                  key={donation.id}
                  href={`/donor/donations/${donation.id}`}
                  className="block rounded-2xl border border-cream-200 bg-white p-4 shadow-sm hover:border-brand-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{donation.title}</h2>
                      <p className="text-sm text-warmgray-600">
                        {donation.quantity} {UNIT_LABELS[donation.unit]} · pickup by {formatDateTime(donation.pickupWindowEnd)}
                      </p>
                      <p className="text-sm text-warmgray-600">Recipient: {ngo?.name ?? "Unassigned"}</p>
                    </div>
                    <DonationStatusBadge status={donation.status} />
                  </div>
                  {(donation.status === "available" || donation.status === "reserved") && (
                    <div className="mt-3">
                      <PickupCountdown deadline={donation.pickupWindowEnd} />
                    </div>
                  )}
                </Link>
              );
            })
          )}
        </section>
      </div>
    </AppShell>
  );
}
