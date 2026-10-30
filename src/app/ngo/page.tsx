"use client";

import { AppShell } from "@/components/layout/AppShell";
import { LocationBoard } from "@/components/maps/LocationBoard";
import { useDemo } from "@/components/providers/DemoProvider";
import { DonationStatusBadge } from "@/components/ui/StatusBadge";
import { haversineKm } from "@/lib/domain/geo";
import { matchesForDonation } from "@/lib/domain/engine";
import { CATEGORY_LABELS, DIETARY_LABELS, UNIT_LABELS } from "@/lib/domain/labels";
import type { DietaryTag, FoodCategory } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function NgoDashboardPage() {
  const { state, user, reserveDonation, rejectDonation } = useDemo();
  const ngo = state.ngos.find((item) => item.id === user.orgId);
  const [category, setCategory] = useState<FoodCategory | "all">("all");
  const [diet, setDiet] = useState<DietaryTag | "all">("all");
  const [maxKm, setMaxKm] = useState(20);
  const [minQty, setMinQty] = useState(0);
  const [view, setView] = useState<"list" | "map">("list");
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("Cannot receive this batch with current kitchen capacity.");

  const listings = useMemo(() => {
    return state.donations
      .filter((donation) => {
        if (category !== "all" && donation.category !== category) return false;
        if (diet !== "all" && !donation.dietaryTags.includes(diet)) return false;
        if (donation.quantity < minQty) return false;
        if (ngo && haversineKm(donation.pickupLocation, ngo.location) > maxKm) return false;
        const startOk = new Date(donation.pickupWindowEnd).getTime() > Date.now() || donation.status !== "available";
        if (!startOk && donation.status === "available") return false;
        return true;
      })
      .sort((a, b) => Number(a.status !== "available") - Number(b.status !== "available"));
  }, [state.donations, category, diet, minQty, maxKm, ngo]);

  const reserved = state.donations.filter((item) => item.reservedNgoId === user.orgId);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">NGO dashboard</h1>
            <p className="text-sm text-warmgray-600">Browse available surplus, read match reasons, and reserve what you can store.</p>
          </div>
          <Link href="/ngo/needs" className="rounded-xl border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-800">
            Edit needs request
          </Link>
        </div>
        <div className="grid gap-3 rounded-2xl border border-cream-200 bg-white p-4 sm:grid-cols-5">
          <label className="text-xs font-medium">
            Category
            <select className="mt-1 w-full rounded-lg border px-2 py-2" value={category} onChange={(e) => setCategory(e.target.value as FoodCategory | "all")}>
              <option value="all">All</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Dietary tag
            <select className="mt-1 w-full rounded-lg border px-2 py-2" value={diet} onChange={(e) => setDiet(e.target.value as DietaryTag | "all")}>
              <option value="all">All</option>
              {Object.entries(DIETARY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Max distance (km)
            <input type="number" className="mt-1 w-full rounded-lg border px-2 py-2" value={maxKm} onChange={(e) => setMaxKm(Number(e.target.value))} />
          </label>
          <label className="text-xs font-medium">
            Min quantity
            <input type="number" className="mt-1 w-full rounded-lg border px-2 py-2" value={minQty} onChange={(e) => setMinQty(Number(e.target.value))} />
          </label>
          <div className="flex items-end gap-2">
            <button type="button" className={`rounded-lg px-3 py-2 text-sm ${view === "list" ? "bg-brand-600 text-white" : "bg-cream-100"}`} onClick={() => setView("list")}>
              List
            </button>
            <button type="button" className={`rounded-lg px-3 py-2 text-sm ${view === "map" ? "bg-brand-600 text-white" : "bg-cream-100"}`} onClick={() => setView("map")}>
              Map / fallback
            </button>
          </div>
        </div>

        {view === "map" && (
          <LocationBoard
            origin={ngo?.location}
            items={listings.map((item) => ({
              id: item.id,
              title: item.title,
              subtitle: `${item.quantity} ${UNIT_LABELS[item.unit]} · ${item.status}`,
              point: item.pickupLocation,
            }))}
          />
        )}

        <section className="space-y-3">
          {listings.map((donation) => {
            const ranked = matchesForDonation(state, donation.id);
            const mine = ranked.find((item) => item.ngoId === user.orgId);
            return (
              <article key={donation.id} className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{donation.title}</h2>
                    <p className="text-sm text-warmgray-600">
                      {donation.quantity} {UNIT_LABELS[donation.unit]} · window {formatDateTime(donation.pickupWindowStart)} – {formatDateTime(donation.pickupWindowEnd)}
                    </p>
                  </div>
                  <DonationStatusBadge status={donation.status} />
                </div>
                <p className="mt-2 text-sm text-brand-900">{mine?.reason ?? "No match evaluation."}</p>
                <p className="text-xs text-warmgray-500">Distance {mine ? `${mine.distanceKm.toFixed(1)} km` : "n/a"} · score {mine?.score?.total.toFixed(1) ?? "—"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {donation.status === "available" && (
                    <button type="button" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => reserveDonation(donation.id)}>
                      Accept & request volunteer
                    </button>
                  )}
                  {donation.reservedNgoId === user.orgId && donation.status === "reserved" && (
                    <button type="button" className="rounded-lg border border-rose-300 px-3 py-2 text-sm" onClick={() => setRejectFor(donation.id)}>
                      Reject with reason
                    </button>
                  )}
                  {donation.reservedNgoId === user.orgId && donation.status === "collected" && (
                    <ReceiptForm donationId={donation.id} max={donation.quantity} />
                  )}
                  <Link className="rounded-lg px-3 py-2 text-sm text-brand-800" href={`/qr/${donation.id}`}>
                    QR passport
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        <section>
          <h2 className="mb-2 font-semibold">Your reserved & in-progress food</h2>
          {reserved.length === 0 ? (
            <p className="text-sm text-warmgray-600">None yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {reserved.map((item) => (
                <li key={item.id} className="rounded-xl bg-cream-100 px-3 py-2">
                  {item.title} · {item.status}
                  {item.status === "collected" && <ReceiptForm donationId={item.id} max={item.quantity} />}
                </li>
              ))}
            </ul>
          )}
        </section>

        {rejectFor && (
          <form
            className="rounded-2xl border border-rose-200 bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              rejectDonation(rejectFor, rejectReason);
              setRejectFor(null);
            }}
          >
            <h3 className="font-semibold">Record rejection reason</h3>
            <textarea className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <button type="submit" className="mt-2 rounded-lg bg-rose-700 px-3 py-2 text-sm text-white">
              Save rejection
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
}

function ReceiptForm({ donationId, max }: { donationId: string; max: number }) {
  const { confirmReceipt } = useDemo();
  const [qty, setQty] = useState(max);
  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        confirmReceipt(donationId, qty);
      }}
    >
      <label className="text-xs font-medium">
        Accepted quantity
        <input type="number" min={0} max={max} className="mt-1 block rounded-lg border px-2 py-1" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
      </label>
      <button type="submit" className="rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white">
        Confirm receipt
      </button>
    </form>
  );
}
