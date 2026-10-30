import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FoodHandlingRecord } from "@/components/donations/FoodHandlingRecord";
import { DiscoveryMap } from "@/components/maps/DiscoveryMap";
import { matchDonationAgainstNGOs } from "@/lib/matching/engine";
import {
  MapPin,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building,
  KeyRound,
  RotateCcw,
} from "lucide-react";

export default async function DonationDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();

  const donation = await prisma.donation.findUnique({
    where: { id: params.id },
    include: {
      donorOrg: true,
      createdByUser: true,
      items: true,
      allocations: {
        include: {
          ngoOrg: true,
          assignments: {
            where: { isCurrent: true },
            include: { volunteer: true },
          },
          handoverEvents: { orderBy: { timestamp: "asc" } },
          handoverChallenges: {
            where: { isVerified: false },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!donation) {
    notFound();
  }

  const item = donation.items[0];
  const remainingQuantity = item ? item.quantity - item.allocatedQuantity : 0;
  const allergens: string[] = JSON.parse(donation.allergens || "[]");
  const dietaryTags: string[] = JSON.parse(donation.dietaryTags || "[]");

  // Run matching engine evaluation to show explainable recommendation candidates
  const matchingEvaluation = item
    ? await matchDonationAgainstNGOs({
        id: donation.id,
        donorOrgId: donation.donorOrgId,
        title: donation.title,
        foodCategory: donation.foodCategory,
        quantity: remainingQuantity > 0 ? remainingQuantity : item.quantity,
        unit: item.unit,
        latitude: donation.latitude,
        longitude: donation.longitude,
        pickupWindowStart: donation.pickupWindowStart,
        pickupWindowEnd: donation.pickupWindowEnd,
      })
    : null;

  // Flatten handover events from allocations
  const allHandoverEvents = donation.allocations.flatMap((a) => a.handoverEvents);

  // Map candidate entities
  const donorMapEntity = {
    id: donation.donorOrgId,
    name: donation.donorOrg.name,
    type: "DONOR" as const,
    latitude: donation.latitude,
    longitude: donation.longitude,
    address: donation.pickupAddress,
  };

  const candidateMapEntities =
    matchingEvaluation?.eligibleCandidates.concat(matchingEvaluation.ineligibleCandidates).map((c) => ({
      id: c.ngoId,
      name: c.ngoName,
      type: "NGO" as const,
      latitude: donation.latitude + (Math.sin(c.distanceKm) * c.distanceKm) / 111,
      longitude: donation.longitude + (Math.cos(c.distanceKm) * c.distanceKm) / 111,
      eligible: c.eligible,
      score: c.score,
      radiusKm: 15,
    })) || [];

  return (
    <div className="space-y-8 py-2">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-warmgray-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-warmgray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                Donation Details
              </span>
              <StatusBadge status={donation.status} type="donation" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-warmgray-900 tracking-tight">
              {donation.title}
            </h1>
            <p className="text-xs text-warmgray-600 mt-1 flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-warmgray-400" />
              <span>Donor: <strong>{donation.donorOrg.name}</strong></span>
              <span>•</span>
              <MapPin className="w-3.5 h-3.5 text-warmgray-400" />
              <span>{donation.pickupAddress}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {session?.role === "NGO" && remainingQuantity > 0 && (
              <Link
                href="/ngo/discover"
                className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-lg text-xs shadow-sm transition flex items-center gap-1.5"
              >
                Accept Allocation <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Quantities bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-cream-50/70 p-4 rounded-xl border border-cream-200/60 text-xs">
          <div>
            <span className="text-[11px] font-bold text-warmgray-500 uppercase block mb-0.5">
              Declared Quantity
            </span>
            <span className="text-lg font-extrabold text-warmgray-900">
              {item?.quantity} {item?.unit}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-warmgray-500 uppercase block mb-0.5">
              Allocated
            </span>
            <span className="text-lg font-extrabold text-brand-700">
              {item?.allocatedQuantity} {item?.unit}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-warmgray-500 uppercase block mb-0.5">
              Remaining Available
            </span>
            <span className="text-lg font-extrabold text-amber-700">
              {remainingQuantity} {item?.unit}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-warmgray-500 uppercase block mb-0.5">
              Handover Verified
            </span>
            <span className="text-lg font-extrabold text-emerald-700">
              {item?.collectedQuantity} {item?.unit}
            </span>
          </div>
        </div>

        {/* Windows and tags */}
        <div className="flex flex-wrap items-center justify-between text-xs text-warmgray-600 gap-4 pt-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-brand-700" />
              Pickup Window:{" "}
              {new Date(donation.pickupWindowStart).toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              -{" "}
              {new Date(donation.pickupWindowEnd).toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "short",
              })} IST
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {dietaryTags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-brand-50 text-brand-800 border border-brand-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Split Allocations Section */}
      <div className="bg-white rounded-2xl border border-warmgray-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-warmgray-100">
          <div>
            <h2 className="text-base font-bold text-warmgray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-700" />
              Split Allocation Breakdown ({donation.allocations.length})
            </h2>
            <p className="text-xs text-warmgray-500">
              Quantities reserved atomically. Each allocation maintains separate assignment and OTP handover records.
            </p>
          </div>
        </div>

        {donation.allocations.length === 0 ? (
          <p className="text-xs text-warmgray-500 italic py-4">
            No portions allocated yet. NGOs can browse and claim full or partial capacity from the discovery portal.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {donation.allocations.map((alloc) => {
              const currentAssign = alloc.assignments[0];
              const activeOtp = alloc.handoverChallenges[0];

              return (
                <div
                  key={alloc.id}
                  className="p-4 rounded-xl border border-warmgray-200 bg-cream-50/50 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-warmgray-900">
                        {alloc.ngoOrg.name}
                      </span>
                      <p className="text-[11px] text-warmgray-500">{alloc.ngoOrg.address}</p>
                    </div>
                    <StatusBadge status={alloc.status} type="allocation" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-warmgray-200">
                    <div>
                      <span className="text-[10px] font-bold text-warmgray-500 uppercase block">
                        Accepted Share
                      </span>
                      <span className="text-sm font-bold text-warmgray-900">
                        {alloc.allocatedQuantity} {alloc.unit}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-warmgray-500 uppercase block">
                        Assigned Runner
                      </span>
                      <span className="text-xs font-semibold text-warmgray-900">
                        {currentAssign?.volunteer?.name || (
                          <span className="text-amber-700">Awaiting dispatch</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-warmgray-200/80">
                    <span className="text-[11px] text-warmgray-500">
                      Status: <strong>{alloc.status}</strong>
                    </span>
                    <Link
                      href={`/handover/${alloc.id}`}
                      className="px-3 py-1.5 bg-brand-700 hover:bg-brand-800 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-sm transition"
                    >
                      <KeyRound className="w-3 h-3" /> Handover & Verification →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deterministic Matching Engine Radar & Candidate Rankings */}
      {matchingEvaluation && (
        <div className="bg-white rounded-2xl border border-warmgray-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-warmgray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                  Explainable Matching Engine
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cream-200 text-warmgray-800">
                  Rule-Based Deterministic
                </span>
              </div>
              <h2 className="text-base font-bold text-warmgray-900">
                Capacity & Distance Radar Evaluation
              </h2>
            </div>
            <span className="text-xs text-warmgray-500">
              {matchingEvaluation.summary}
            </span>
          </div>

          {/* Interactive Map Radar */}
          <DiscoveryMap
            center={{ latitude: donation.latitude, longitude: donation.longitude }}
            donor={donorMapEntity}
            candidates={candidateMapEntities}
          />

          {/* Ranked Candidates Breakdown */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-warmgray-800 uppercase tracking-wider">
              Eligible Ranked Candidate NGOs ({matchingEvaluation.eligibleCandidates.length})
            </h3>

            {matchingEvaluation.eligibleCandidates.length === 0 ? (
              <p className="text-xs text-warmgray-500 italic py-2">
                No active NGOs currently meet all hard capacity, operating hours, and radius checks.
              </p>
            ) : (
              <div className="space-y-2">
                {matchingEvaluation.eligibleCandidates.map((cand, idx) => (
                  <div
                    key={cand.ngoId}
                    className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 text-xs flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-warmgray-900 text-sm">
                          {cand.ngoName}
                        </span>
                        <span className="text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                          Score: {cand.score}/100
                        </span>
                      </div>
                      <p className="text-warmgray-700 text-xs">{cand.explanation}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-bold text-warmgray-900 block">
                        {cand.distanceKm} km away
                      </span>
                      <span className="text-[11px] text-warmgray-500 block">
                        ~{cand.travelTimeMinutes} mins travel
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ineligible Candidates with Explicit Reasons */}
          {matchingEvaluation.ineligibleCandidates.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-warmgray-100">
              <h3 className="text-xs font-bold text-warmgray-500 uppercase tracking-wider">
                Excluded Candidates & Reasons ({matchingEvaluation.ineligibleCandidates.length})
              </h3>
              <div className="space-y-1.5">
                {matchingEvaluation.ineligibleCandidates.map((c) => (
                  <div
                    key={c.ngoId}
                    className="p-2.5 rounded-lg border border-warmgray-200 bg-warmgray-50 text-xs flex items-center justify-between"
                  >
                    <span className="font-bold text-warmgray-700">{c.ngoName}</span>
                    <span className="text-[11px] text-rose-700">
                      {c.reasons.join(" ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Food Handling Record Timeline */}
      <FoodHandlingRecord
        storageInfo={donation.storageInfo}
        packagingInfo={donation.packagingInfo}
        allergens={allergens}
        dietaryTags={dietaryTags}
        preparationTime={donation.preparationTime}
        handlingNotes={donation.handlingNotes}
        handoverEvents={allHandoverEvents}
      />
    </div>
  );
}
