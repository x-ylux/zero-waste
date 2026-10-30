import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Calendar, Clock, PlusCircle, CheckCircle2, Shield, MapPin } from "lucide-react";

export default async function NgoCapacityPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const org = await prisma.organisation.findUnique({
    where: { id: session.organisationId || undefined },
    include: {
      capacityWindows: {
        orderBy: { startTime: "asc" },
      },
      verifications: true,
    },
  });

  if (!org || org.type !== "NGO") {
    return (
      <div className="p-8 text-center text-xs text-warmgray-500">
        You must be signed in as a verified NGO to configure capacity settings.
      </div>
    );
  }

  const acceptedCategories: string[] = JSON.parse(org.acceptedCategories || "[]");

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-8">
      <div>
        <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
          Organisation Profile & Operational Parameters
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-warmgray-900 tracking-tight">
          NGO Operating Hours & Capacity Windows
        </h1>
        <p className="text-xs text-warmgray-600 mt-1">
          The matching engine strictly enforces these limits. Missing capacity windows are never assumed to be unlimited.
        </p>
      </div>

      {/* Organisation Overview Card */}
      <div className="bg-white p-6 rounded-2xl border border-warmgray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-warmgray-100">
          <div>
            <h2 className="text-base font-bold text-warmgray-900">{org.name}</h2>
            <p className="text-xs text-warmgray-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5" /> {org.address}
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              org.isVerified
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {org.isVerified ? "Verified Partner" : "Verification Pending"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-cream-50 rounded-xl border border-cream-200">
            <span className="font-bold text-warmgray-500 uppercase text-[10px] block mb-1">
              Daily Operating Hours
            </span>
            <span className="text-sm font-bold text-warmgray-900">
              {org.operatingHoursStart} - {org.operatingHoursEnd} IST
            </span>
          </div>

          <div className="p-3 bg-cream-50 rounded-xl border border-cream-200">
            <span className="font-bold text-warmgray-500 uppercase text-[10px] block mb-1">
              Permitted Collection Radius
            </span>
            <span className="text-sm font-bold text-warmgray-900">
              {org.collectionRadiusKm} km
            </span>
          </div>

          <div className="p-3 bg-cream-50 rounded-xl border border-cream-200">
            <span className="font-bold text-warmgray-500 uppercase text-[10px] block mb-1">
              Accepted Food Categories
            </span>
            <span className="text-xs font-semibold text-warmgray-900">
              {acceptedCategories.length > 0
                ? acceptedCategories.join(", ")
                : "None configured"}
            </span>
          </div>
        </div>
      </div>

      {/* Capacity Windows Table */}
      <div className="bg-white p-6 rounded-2xl border border-warmgray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-warmgray-100">
          <div>
            <h3 className="text-base font-bold text-warmgray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-700" />
              Active Capacity Windows ({org.capacityWindows.length})
            </h3>
            <p className="text-xs text-warmgray-500">
              Surplus allocations check against these atomic reservations during the collection window.
            </p>
          </div>
        </div>

        {org.capacityWindows.length === 0 ? (
          <p className="text-xs text-warmgray-500 italic py-4">
            No capacity windows configured. Donations will not match this NGO until a capacity window is declared.
          </p>
        ) : (
          <div className="divide-y divide-warmgray-100">
            {org.capacityWindows.map((cw) => {
              const remaining = Math.max(0, cw.maxCapacity - cw.reservedCapacity);
              return (
                <div key={cw.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-warmgray-900 text-sm block">
                      {new Date(cw.startTime).toLocaleTimeString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(cw.endTime).toLocaleTimeString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                      })} IST
                    </span>
                    <span className="text-warmgray-500 text-[11px]">
                      {cw.notes || "Regular dining distribution"}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-brand-800 block">
                      Max: {cw.maxCapacity} {cw.unit}
                    </span>
                    <span className="text-[11px] text-warmgray-500 block">
                      Reserved: {cw.reservedCapacity} • Available: {remaining}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
