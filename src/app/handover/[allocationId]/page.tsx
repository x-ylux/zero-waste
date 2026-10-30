"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  KeyRound,
  ShieldCheck,
  PackageCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FoodHandlingRecord } from "@/components/donations/FoodHandlingRecord";

export default function HandoverPage() {
  const params = useParams();
  const router = useRouter();
  const allocationId = params.allocationId as string;

  const [allocation, setAllocation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Active challenge state
  const [stage, setStage] = useState<"COLLECTION" | "DELIVERY">("COLLECTION");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [generatingChallenge, setGeneratingChallenge] = useState(false);

  // Verification form state
  const [otp, setOtp] = useState("");
  const [verifiedQuantity, setVerifiedQuantity] = useState(0);
  const [rejectedQuantity, setRejectedQuantity] = useState(0);
  const [rejectionReason, setRejectionReason] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [foodSafetyFlagged, setFoodSafetyFlagged] = useState(false);
  const [foodSafetyNotes, setFoodSafetyNotes] = useState("");
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const fetchAllocation = useCallback(async () => {
    setLoading(true);
    try {
      // Find allocation through donation details API or direct query
      const res = await fetch("/api/donations");
      const data = await res.json();
      if (data.donations) {
        let foundAlloc = null;
        for (const d of data.donations) {
          const matched = d.allocations.find((a: any) => a.id === allocationId);
          if (matched) {
            foundAlloc = { ...matched, donation: d };
            break;
          }
        }
        if (foundAlloc) {
          setAllocation(foundAlloc);
          // Determine current stage
          if (foundAlloc.status === "COLLECTED") {
            setStage("DELIVERY");
            setVerifiedQuantity(foundAlloc.collectedQuantity || foundAlloc.allocatedQuantity);
          } else {
            setStage("COLLECTION");
            setVerifiedQuantity(foundAlloc.allocatedQuantity);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load allocation", err);
    } finally {
      setLoading(false);
    }
  }, [allocationId]);

  useEffect(() => {
    fetchAllocation();
  }, [fetchAllocation]);

  const handleGenerateChallenge = async () => {
    setGeneratingChallenge(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/allocations/${allocationId}/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Challenge generation failed", error: true });
      } else {
        setChallengeId(data.challengeId);
        setExpiresAt(data.expiresAt);
        if (data.demoCode) {
          setDemoCode(data.demoCode);
          setOtp(data.demoCode); // Pre-fill in demo mode for frictionless review
        }
        setMessage({
          text: `A 6-digit challenge code was generated server-side for ${stage}. Valid for 15 minutes.`,
          error: false,
        });
      }
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    } finally {
      setGeneratingChallenge(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingVerification(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/allocations/${allocationId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage,
          otp,
          verifiedQuantity: Number(verifiedQuantity),
          rejectedQuantity: Number(rejectedQuantity),
          rejectionReason: rejectedQuantity > 0 ? rejectionReason : null,
          inspectionNotes,
          foodSafetyFlagged,
          foodSafetyNotes: foodSafetyFlagged ? foodSafetyNotes : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Verification failed.", error: true });
      } else {
        setMessage({
          text: `Success! Handover verified for ${stage}. Status updated to ${data.allocationStatus}.`,
          error: false,
        });
        setChallengeId(null);
        setDemoCode(null);
        setOtp("");
        setTimeout(() => {
          fetchAllocation();
        }, 1200);
      }
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    } finally {
      setSubmittingVerification(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-warmgray-500">Loading handover workspace...</div>;
  }

  if (!allocation) {
    return (
      <div className="p-12 text-center text-xs text-warmgray-500">
        Allocation not found. Please verify the ID.
      </div>
    );
  }

  const isCompleted =
    allocation.status === "DELIVERED" ||
    allocation.status === "PARTIALLY_DELIVERED" ||
    allocation.status === "REJECTED";

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
            Verified Handover Protocol
          </span>
          <StatusBadge status={allocation.status} type="allocation" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-warmgray-900 tracking-tight">
          Handover Verification: {allocation.donation?.title}
        </h1>
        <p className="text-xs text-warmgray-600 mt-0.5">
          Surplus custody transfer between <strong>{allocation.donation?.donorOrg?.name}</strong> and{" "}
          <strong>{allocation.ngoOrg?.name}</strong>.
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

      {/* Handover Stages Tabs */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className={`p-4 rounded-xl border text-xs space-y-1 ${
            stage === "COLLECTION"
              ? "bg-white border-brand-500 ring-2 ring-brand-100 shadow-sm"
              : "bg-warmgray-50 border-warmgray-200"
          }`}
        >
          <span className="font-bold text-sm text-warmgray-900 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-brand-700 text-white flex items-center justify-center text-[10px] font-bold">
              1
            </span>
            Donor Collection
          </span>
          <p className="text-warmgray-500 text-[11px]">
            Donor generates challenge • Runner enters code to confirm pickup.
          </p>
          <span className="text-brand-800 font-semibold block pt-1">
            {allocation.status === "COLLECTED" || isCompleted ? "✓ Completed" : "Current Step"}
          </span>
        </div>

        <div
          className={`p-4 rounded-xl border text-xs space-y-1 ${
            stage === "DELIVERY"
              ? "bg-white border-purple-500 ring-2 ring-purple-100 shadow-sm"
              : "bg-warmgray-50 border-warmgray-200"
          }`}
        >
          <span className="font-bold text-sm text-warmgray-900 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-purple-700 text-white flex items-center justify-center text-[10px] font-bold">
              2
            </span>
            NGO Delivery
          </span>
          <p className="text-warmgray-500 text-[11px]">
            NGO generates challenge • Records accepted and rejected quantities.
          </p>
          <span className="text-purple-800 font-semibold block pt-1">
            {isCompleted ? "✓ Completed" : allocation.status === "COLLECTED" ? "Ready for Delivery" : "Awaiting Collection"}
          </span>
        </div>
      </div>

      {isCompleted ? (
        <div className="bg-white p-8 rounded-2xl border border-warmgray-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-warmgray-900">
            Handover Completed & Verified
          </h2>
          <p className="text-xs text-warmgray-600 max-w-md mx-auto">
            This allocation was delivered to {allocation.ngoOrg.name}. Accepted:{" "}
            <strong>{allocation.deliveredQuantity} {allocation.unit}</strong>.
            {allocation.rejectedQuantity ? ` Rejected: ${allocation.rejectedQuantity} ${allocation.unit}.` : ""}
          </p>
          <div className="pt-2">
            <Link
              href="/impact"
              className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow"
            >
              View Verified Operational Impact →
            </Link>
          </div>
        </div>
      ) : (
        /* Active Handover Challenge Card */
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-warmgray-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-warmgray-100">
            <div>
              <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider block">
                Stage: {stage}
              </span>
              <h2 className="text-base font-bold text-warmgray-900">
                {stage === "COLLECTION" ? "Donor Collection Verification" : "NGO Receipt & Inspection"}
              </h2>
            </div>

            <button
              onClick={handleGenerateChallenge}
              disabled={generatingChallenge}
              className="px-4 py-2 bg-warmgray-900 hover:bg-warmgray-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {generatingChallenge ? "Generating..." : "Generate 6-Digit Challenge"}
            </button>
          </div>

          {demoCode && (
            <div className="p-4 bg-cream-100/80 border border-cream-300 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-warmgray-600 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-brand-700" /> Demo Mode Challenge Code Helper:
              </span>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black tracking-widest text-brand-900 font-mono bg-white px-3 py-1 rounded border border-cream-300">
                  {demoCode}
                </span>
                <span className="text-xs text-warmgray-600">
                  (In production, this code is held by the {stage === "COLLECTION" ? "Donor" : "NGO"} and entered by the collector).
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label htmlFor="handover-code" className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                Enter 6-Digit Verification Challenge Code *
              </label>
              <input
                id="handover-code"
                type="text"
                required
                maxLength={6}
                pattern="[0-9]{6}"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full sm:w-48 px-3 py-2 text-lg font-mono font-bold tracking-widest border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-center"
              />
              <p className="text-[11px] text-warmgray-500 mt-1">
                Stored as a salted bcrypt hash with 5 max attempts and 15-minute expiry.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="accepted-quantity" className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                  Verified Accepted Quantity ({allocation.unit}) *
                </label>
                <input
                  id="accepted-quantity"
                  type="number"
                  min="0"
                  required
                  value={verifiedQuantity}
                  onChange={(e) => setVerifiedQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                />
              </div>

              {stage === "DELIVERY" && (
                <div>
                  <label htmlFor="rejected-quantity" className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                    Rejected / Damaged Quantity ({allocation.unit})
                  </label>
                  <input
                    id="rejected-quantity"
                    type="number"
                    min="0"
                    value={rejectedQuantity}
                    onChange={(e) => setRejectedQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                  />
                </div>
              )}
            </div>

            {rejectedQuantity > 0 && (
              <div>
                <label htmlFor="rejection-reason" className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-1">
                  Mandatory Rejection Reason *
                </label>
                <input
                  id="rejection-reason"
                  type="text"
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Broken packaging seal, cold temperature violation..."
                  className="w-full px-3 py-2 text-sm border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none bg-rose-50/30"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                Inspection & Handover Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                placeholder="e.g. Stainless steel canisters intact. Clean containers."
                className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            {/* Food Safety Flagging */}
            <div className="p-3 bg-warmgray-50 rounded-xl border border-warmgray-200 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={foodSafetyFlagged}
                  onChange={(e) => setFoodSafetyFlagged(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs font-bold text-warmgray-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  Flag Food Safety Concern (Automatically logs Incident for Admin)
                </span>
              </label>
              {foodSafetyFlagged && (
                <textarea
                  rows={2}
                  required
                  value={foodSafetyNotes}
                  onChange={(e) => setFoodSafetyNotes(e.target.value)}
                  placeholder="Describe observed safety concern..."
                  className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-amber-50/40"
                />
              )}
            </div>

            <button
              type="submit"
              disabled={submittingVerification || otp.length !== 6}
              className="w-full py-3.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-sm font-bold shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submittingVerification ? "Committing Handover Event..." : `Verify & Commit ${stage} Handover`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
