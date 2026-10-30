"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Filter,
  Package,
  Calendar,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { isActiveDonationListing } from "@/lib/donations/listing";
import { DonationStatusType } from "@/lib/types/domain";

export default function NgoDiscoverPage() {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDonation, setSelectedDonation] = useState<any | null>(null);
  const [acceptQuantity, setAcceptQuantity] = useState<number>(50);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/donations?active=true");
      const data: {
        donations?: Array<{ status: DonationStatusType; pickupWindowEnd: string }>;
      } = await res.json();
      if (data.donations) {
        setDonations(
          data.donations.filter((donation) => isActiveDonationListing(donation))
        );
      }
    } catch (err) {
      console.error("Failed to load donations", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAcceptModal = (donation: any) => {
    setSelectedDonation(donation);
    const item = donation.items[0];
    const available = item ? item.quantity - item.allocatedQuantity : 0;
    // Sensible default (up to available or 60)
    setAcceptQuantity(Math.min(60, available));
    setActionMessage(null);
  };

  const handleConfirmAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonation) return;

    setSubmitting(true);
    setActionMessage(null);

    const item = selectedDonation.items[0];

    try {
      const res = await fetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donationId: selectedDonation.id,
          donationItemId: item.id,
          allocatedQuantity: Number(acceptQuantity),
          unit: item.unit,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMessage({ text: data.error || "Allocation failed", error: true });
      } else {
        setActionMessage({
          text: `Success! Allocated ${acceptQuantity} ${item.unit} to your NGO.`,
          error: false,
        });
        setTimeout(() => {
          setSelectedDonation(null);
          fetchDonations();
        }, 1500);
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || "Network error", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-warmgray-200">
        <div>
          <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
            NGO Food Redistribution Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-warmgray-900 tracking-tight">
            Discover & Accept Surplus Food
          </h1>
          <p className="text-xs text-warmgray-600 mt-0.5">
            Claim full batches or accept partial split allocations matching your shelter capacity.
          </p>
        </div>

        <Link
          href="/ngo/capacity"
          className="px-4 py-2 border border-warmgray-300 hover:bg-cream-50 text-warmgray-800 rounded-xl text-xs font-semibold self-start sm:self-auto transition"
        >
          Manage Operating Capacity Windows →
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-warmgray-500">
          Loading active surplus batches...
        </div>
      ) : donations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-warmgray-200 p-12 text-center max-w-md mx-auto space-y-3">
          <Layers className="w-10 h-10 text-warmgray-400 mx-auto" />
          <h3 className="font-bold text-warmgray-900 text-sm">No Open Donations Available</h3>
          <p className="text-xs text-warmgray-500">
            Check back shortly or publish a test donation as a food donor to evaluate matching.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {donations.map((d) => {
            const item = d.items[0];
            const remaining = item ? item.quantity - item.allocatedQuantity : 0;
            const allergens: string[] = JSON.parse(d.allergens || "[]");

            return (
              <div
                key={d.id}
                className="bg-white rounded-2xl border border-warmgray-200 p-6 shadow-sm space-y-4 hover:border-brand-500/50 hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-warmgray-500 uppercase tracking-wider">
                      {d.donorOrg.name}
                    </span>
                    <StatusBadge status={d.status} type="donation" />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-warmgray-900 leading-snug">
                      <Link href={`/donations/${d.id}`} className="hover:text-brand-700 transition">
                        {d.title}
                      </Link>
                    </h2>
                    <p className="text-xs text-warmgray-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-warmgray-400" />
                      {d.pickupAddress}
                    </p>
                  </div>

                  {/* Quantity and units */}
                  <div className="bg-cream-50 p-3 rounded-xl border border-cream-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[11px] font-bold text-warmgray-500 uppercase block">
                        Available Remaining
                      </span>
                      <span className="text-base font-extrabold text-brand-800">
                        {remaining} {item?.unit}
                      </span>
                      <span className="text-[11px] text-warmgray-400 block">
                        of {item?.quantity} total listed
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-warmgray-500 uppercase block">
                        Storage & Packing
                      </span>
                      <span className="font-semibold text-warmgray-800 block">
                        {d.storageInfo.replace("_", " ")}
                      </span>
                      <span className="text-[11px] text-warmgray-500 block">
                        {d.packagingInfo.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Windows */}
                  <div className="text-xs text-warmgray-600 space-y-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-brand-600" />
                      <span>
                        Deadline:{" "}
                        {new Date(d.pickupWindowEnd).toLocaleTimeString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })} IST
                      </span>
                    </div>
                    {allergens.length > 0 && (
                      <div className="text-[11px] text-warmgray-500 flex items-center gap-1">
                        <span>Allergens:</span>
                        <span className="font-medium text-rose-800">
                          {allergens.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-warmgray-100 flex items-center justify-between gap-3">
                  <Link
                    href={`/donations/${d.id}`}
                    className="text-xs font-semibold text-warmgray-600 hover:text-warmgray-900 transition"
                  >
                    View Radar →
                  </Link>
                  <button
                    onClick={() => handleOpenAcceptModal(d)}
                    disabled={remaining <= 0}
                    className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    Accept Portions <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Split Allocation Modal */}
      {selectedDonation && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-warmgray-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-warmgray-200">
              <div>
                <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider block">
                  Capacity-Aware Split Allocation
                </span>
                <h3 className="text-base font-bold text-warmgray-900">
                  Accept Food Share
                </h3>
              </div>
              <button
                onClick={() => setSelectedDonation(null)}
                className="text-warmgray-400 hover:text-warmgray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {actionMessage && (
              <div
                className={`p-3 rounded-lg text-xs font-medium ${
                  actionMessage.error
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}
              >
                {actionMessage.text}
              </div>
            )}

            <form onSubmit={handleConfirmAllocation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                  Donation Batch
                </label>
                <p className="text-xs font-semibold text-warmgray-900 bg-warmgray-50 p-2.5 rounded-lg border border-warmgray-200">
                  {selectedDonation.title}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Quantity to Accept ({selectedDonation.items[0]?.unit}) *</span>
                  <span className="text-[11px] text-brand-700 font-semibold lowercase">
                    Max available:{" "}
                    {selectedDonation.items[0]?.quantity -
                      selectedDonation.items[0]?.allocatedQuantity}{" "}
                    {selectedDonation.items[0]?.unit}
                  </span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={
                    selectedDonation.items[0]?.quantity -
                    selectedDonation.items[0]?.allocatedQuantity
                  }
                  value={acceptQuantity}
                  onChange={(e) => setAcceptQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                />
                <p className="text-[11px] text-warmgray-500 mt-1">
                  Accept all or a partial portion. Capacity reservation is verified atomically in your active operating window.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDonation(null)}
                  className="px-4 py-2 border border-warmgray-300 rounded-lg text-xs font-medium text-warmgray-700 hover:bg-warmgray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || acceptQuantity <= 0}
                  className="px-5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5"
                >
                  {submitting ? "Reserving..." : "Confirm Atomic Allocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
