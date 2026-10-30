import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PlusCircle, Utensils, Calendar, MapPin, ArrowRight, Clock, AlertCircle } from "lucide-react";

export default async function DonorDashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/login");
  }

  // Fetch donations for donor's organisation
  const donations = await prisma.donation.findMany({
    where: session.role === "ADMIN" ? {} : { donorOrgId: session.organisationId || undefined },
    include: {
      items: true,
      allocations: {
        include: {
          ngoOrg: true,
          assignments: {
            where: { isCurrent: true },
            include: { volunteer: true },
          },
        },
      },
      donorOrg: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-warmgray-200">
        <div>
          <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
            Donor Operations Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-warmgray-900 tracking-tight">
            Surplus Food Inventory & Allocations
          </h1>
          <p className="text-xs text-warmgray-600 mt-0.5">
            Organisation: <strong>{session.organisationName || "All Donors (Admin Mode)"}</strong>
          </p>
        </div>

        <Link
          href="/donor/donations/create"
          className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-sm font-bold shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" /> Publish New Surplus Batch
        </Link>
      </div>

      {donations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-warmgray-200 p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-cream-100 text-brand-700 flex items-center justify-center mx-auto">
            <Utensils className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-warmgray-900">No Donations Listed Yet</h3>
          <p className="text-xs text-warmgray-600">
            Publish your first surplus food listing with declared portion sizes, packaging details, and collection deadline.
          </p>
          <Link
            href="/donor/donations/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-700 text-white text-xs font-bold rounded-lg hover:bg-brand-800 transition"
          >
            <PlusCircle className="w-4 h-4" /> Create Listing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {donations.map((d) => {
            const item = d.items[0];
            const remaining = item ? item.quantity - item.allocatedQuantity : 0;
            const allergens: string[] = JSON.parse(d.allergens || "[]");

            return (
              <div
                key={d.id}
                className="bg-white rounded-2xl border border-warmgray-200 p-6 shadow-sm space-y-4 hover:border-warmgray-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-warmgray-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg font-bold text-warmgray-900 hover:text-brand-700 transition">
                        <Link href={`/donations/${d.id}`}>{d.title}</Link>
                      </h2>
                      <StatusBadge status={d.status} type="donation" />
                    </div>
                    <p className="text-xs text-warmgray-500 flex items-center gap-2">
                      <span>Category: <strong>{d.foodCategory.replace("_", " ")}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-warmgray-400" /> {d.pickupAddress}
                      </span>
                    </p>
                  </div>

                  <Link
                    href={`/donations/${d.id}`}
                    className="px-3.5 py-1.5 border border-warmgray-300 hover:bg-cream-50 text-warmgray-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition"
                  >
                    View Details & Match Radar <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Quantities breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-cream-50/60 p-4 rounded-xl border border-cream-200/60 text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-warmgray-500 uppercase block mb-0.5">
                      Total Listed
                    </span>
                    <span className="text-base font-extrabold text-warmgray-900">
                      {item ? `${item.quantity} ${item.unit}` : "0"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-warmgray-500 uppercase block mb-0.5">
                      Allocated to NGOs
                    </span>
                    <span className="text-base font-extrabold text-brand-700">
                      {item ? `${item.allocatedQuantity} ${item.unit}` : "0"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-warmgray-500 uppercase block mb-0.5">
                      Available Unallocated
                    </span>
                    <span className="text-base font-extrabold text-amber-700">
                      {remaining} {item?.unit}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-warmgray-500 uppercase block mb-0.5">
                      Handover Collected
                    </span>
                    <span className="text-base font-extrabold text-emerald-700">
                      {item ? `${item.collectedQuantity} ${item.unit}` : "0"}
                    </span>
                  </div>
                </div>

                {/* Split allocations list */}
                {d.allocations.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <h3 className="text-xs font-bold text-warmgray-700 uppercase tracking-wider">
                      Split Allocations Breakdown ({d.allocations.length} Recipient NGOs)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {d.allocations.map((alloc) => {
                        const currentAssign = alloc.assignments[0];
                        return (
                          <div
                            key={alloc.id}
                            className="p-3 rounded-lg border border-warmgray-200 bg-white text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-warmgray-900">
                                {alloc.ngoOrg.name}
                              </span>
                              <StatusBadge status={alloc.status} type="allocation" />
                            </div>
                            <div className="flex items-center justify-between text-warmgray-600">
                              <span>Accepted: <strong>{alloc.allocatedQuantity} {alloc.unit}</strong></span>
                              <span>
                                {currentAssign?.volunteer ? (
                                  <span className="text-brand-800 font-medium">
                                    Runner: {currentAssign.volunteer.name}
                                  </span>
                                ) : (
                                  <span className="text-amber-700 italic">Awaiting runner</span>
                                )}
                              </span>
                            </div>
                            <div className="pt-1 flex items-center justify-between border-t border-warmgray-100">
                              <span className="text-[11px] text-warmgray-400">
                                Created {new Date(alloc.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                              </span>
                              <Link
                                href={`/handover/${alloc.id}`}
                                className="text-brand-700 hover:underline font-semibold text-[11px]"
                              >
                                Collection OTP & Handover →
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between text-[11px] text-warmgray-500 pt-2 border-t border-warmgray-100 gap-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-warmgray-400" />
                    Pickup Window:{" "}
                    {new Date(d.pickupWindowStart).toLocaleTimeString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {new Date(d.pickupWindowEnd).toLocaleTimeString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    })} IST
                  </span>
                  <span>Packaging: {d.packagingInfo.replace("_", " ")}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
