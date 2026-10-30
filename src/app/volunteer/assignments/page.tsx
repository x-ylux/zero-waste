"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Shield,
  KeyRound,
  Package,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function VolunteerAssignmentsPage() {
  const [profile, setProfile] = useState<any | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModalAssignment, setCancelModalAssignment] = useState<any | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/volunteer/profile");
      const data = await res.json();
      if (data.profile) setProfile(data.profile);
      if (data.assignments) setAssignments(data.assignments);
    } catch (err) {
      console.error("Failed to load volunteer assignments", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondOffer = async (assignmentId: string, action: "ACCEPT" | "DECLINE") => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Response failed", error: true });
      } else {
        setMessage({ text: data.message, error: false });
        fetchAssignments();
      }
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalAssignment) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/assignments/${cancelModalAssignment.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancellationReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Cancellation failed", error: true });
      } else {
        setMessage({ text: data.message, error: false });
        setCancelModalAssignment(null);
        setCancellationReason("");
        fetchAssignments();
      }
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-warmgray-200">
        <div>
          <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
            Volunteer Runner Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-warmgray-900 tracking-tight">
            Assigned Pickups & Active Offers
          </h1>
          <p className="text-xs text-warmgray-600 mt-0.5">
            Collect food from donors and deliver directly to partner NGOs using verified handover challenges.
          </p>
        </div>

        <Link
          href="/volunteer/availability"
          className="px-4 py-2 border border-warmgray-300 hover:bg-cream-50 text-warmgray-800 rounded-xl text-xs font-semibold self-start sm:self-auto transition"
        >
          Carrying Profile & Radius →
        </Link>
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

      {loading ? (
        <div className="p-12 text-center text-xs text-warmgray-500">
          Loading your assignments...
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-warmgray-200 p-12 text-center max-w-md mx-auto space-y-3">
          <Truck className="w-10 h-10 text-warmgray-400 mx-auto" />
          <h3 className="font-bold text-warmgray-900 text-sm">No Assignments Found</h3>
          <p className="text-xs text-warmgray-500">
            You do not have any active offers or pickups scheduled right now.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((assign) => {
            const alloc = assign.allocation;
            const donation = alloc?.donation;
            const item = alloc?.donationItem;

            return (
              <div
                key={assign.id}
                className={`bg-white rounded-2xl border p-6 shadow-sm space-y-4 transition ${
                  assign.isCurrent ? "border-warmgray-200" : "border-warmgray-100 opacity-60 bg-warmgray-50/50"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-warmgray-100">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-warmgray-900">
                        {donation?.title || "Donation Pickup"}
                      </span>
                      <StatusBadge status={assign.status} type="assignment" />
                      {!assign.isCurrent && (
                        <span className="text-[10px] uppercase font-bold text-warmgray-400">
                          (Archived History)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-warmgray-500">
                      Quantity: <strong>{alloc?.allocatedQuantity} {alloc?.unit}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {assign.status === "OFFERED" && (
                      <>
                        <button
                          onClick={() => handleRespondOffer(assign.id, "ACCEPT")}
                          disabled={actionLoading}
                          className="px-3.5 py-1.5 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold transition shadow-sm"
                        >
                          Accept Offer
                        </button>
                        <button
                          onClick={() => handleRespondOffer(assign.id, "DECLINE")}
                          disabled={actionLoading}
                          className="px-3.5 py-1.5 border border-warmgray-300 hover:bg-warmgray-100 text-warmgray-700 rounded-lg text-xs font-medium transition"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {["ACCEPTED", "ASSIGNED"].includes(assign.status) && (
                      <>
                        <Link
                          href={`/handover/${alloc.id}`}
                          className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                        >
                          <KeyRound className="w-3.5 h-3.5" /> Start Handover
                        </Link>
                        <button
                          onClick={() => setCancelModalAssignment(assign)}
                          className="px-3 py-2 border border-rose-300 text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-medium transition"
                        >
                          Cancel Pickup
                        </button>
                      </>
                    )}

                    {["COLLECTED"].includes(assign.status) && (
                      <Link
                        href={`/handover/${alloc.id}`}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                      >
                        <KeyRound className="w-3.5 h-3.5" /> Confirm Delivery to NGO
                      </Link>
                    )}
                  </div>
                </div>

                {/* Pickup & Destination Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-cream-50 rounded-xl border border-cream-200 space-y-1">
                    <span className="font-bold text-warmgray-500 uppercase text-[10px] block">
                      Origin Pickup (Donor)
                    </span>
                    <span className="font-bold text-warmgray-900 block">
                      {donation?.donorOrg?.name || "Campus Mess"}
                    </span>
                    <p className="text-warmgray-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-warmgray-400" />
                      {donation?.pickupAddress}
                    </p>
                  </div>

                  <div className="p-3 bg-cream-50 rounded-xl border border-cream-200 space-y-1">
                    <span className="font-bold text-warmgray-500 uppercase text-[10px] block">
                      Destination Delivery (NGO)
                    </span>
                    <span className="font-bold text-warmgray-900 block">
                      {alloc?.ngoOrg?.name}
                    </span>
                    <p className="text-warmgray-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-warmgray-400" />
                      {alloc?.ngoOrg?.address}
                    </p>
                  </div>
                </div>

                {assign.cancellationReason && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900">
                    <strong>Cancellation Reason:</strong> {assign.cancellationReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Volunteer Cancellation Modal */}
      {cancelModalAssignment && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-warmgray-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-warmgray-200">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-warmgray-900">
                  Cancel Assigned Pickup
                </h3>
              </div>
              <button
                onClick={() => setCancelModalAssignment(null)}
                className="text-warmgray-400 hover:text-warmgray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-warmgray-600">
              Cancelling before collection preserves your assignment history and automatically triggers the system to locate an eligible backup volunteer within range.
            </p>

            <form onSubmit={handleCancelAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                  Mandatory Cancellation Reason (Min 5 chars) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="e.g. Vehicle flat tire on Outer Ring Road..."
                  className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalAssignment(null)}
                  className="px-4 py-2 border border-warmgray-300 rounded-lg text-xs font-medium text-warmgray-700 hover:bg-warmgray-50"
                >
                  Keep Assignment
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || cancellationReason.trim().length < 5}
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow transition disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Confirm Cancellation & Trigger Backup"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
