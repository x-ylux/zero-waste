import React from "react";
import { AlertCircle, Clock, PackageCheck, Thermometer, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";

interface HandoverEventItem {
  id: string;
  stage: "COLLECTION" | "DELIVERY";
  verifiedQuantity: number;
  rejectedQuantity?: number;
  rejectionReason?: string | null;
  inspectionNotes?: string | null;
  foodSafetyFlagged?: boolean;
  foodSafetyNotes?: string | null;
  timestamp: string | Date;
}

interface FoodHandlingRecordProps {
  storageInfo: string;
  packagingInfo: string;
  allergens: string[];
  dietaryTags: string[];
  preparationTime?: string | Date | null;
  handlingNotes?: string | null;
  handoverEvents?: HandoverEventItem[];
}

export function FoodHandlingRecord({
  storageInfo,
  packagingInfo,
  allergens,
  dietaryTags,
  preparationTime,
  handlingNotes,
  handoverEvents = [],
}: FoodHandlingRecordProps) {
  const formatTime = (d?: string | Date | null) => {
    if (!d) return "Not specified";
    return new Date(d).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-warmgray-200 overflow-hidden shadow-sm">
      <div className="bg-cream-100/70 border-b border-cream-200 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-brand-700" />
          <h3 className="font-bold text-sm text-warmgray-900">
            Chain of Custody & Food-Handling Record
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-warmgray-500 uppercase tracking-wide">
          Audit Verified
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Donor Declared Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-warmgray-100">
          <div>
            <span className="text-[11px] font-bold text-warmgray-500 uppercase flex items-center gap-1 mb-1">
              <Thermometer className="w-3.5 h-3.5 text-amber-600" /> Storage Info
            </span>
            <span className="text-xs font-semibold text-warmgray-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
              {storageInfo.replace("_", " ")}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-warmgray-500 uppercase flex items-center gap-1 mb-1">
              <PackageCheck className="w-3.5 h-3.5 text-blue-600" /> Packaging
            </span>
            <span className="text-xs font-semibold text-warmgray-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
              {packagingInfo.replace("_", " ")}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-warmgray-500 uppercase flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-brand-600" /> Prep Time
            </span>
            <span className="text-xs font-medium text-warmgray-800">
              {formatTime(preparationTime)}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-warmgray-500 uppercase flex items-center gap-1 mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Declared Allergens
            </span>
            <div className="flex flex-wrap gap-1">
              {allergens.length > 0 ? (
                allergens.map((a, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-semibold text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200"
                  >
                    {a}
                  </span>
                ))
              ) : (
                <span className="text-xs text-warmgray-500">None declared</span>
              )}
            </div>
          </div>
        </div>

        {/* Handling Notes */}
        {handlingNotes && (
          <div className="bg-cream-50 p-3 rounded-lg border border-cream-200 text-xs">
            <span className="font-bold text-warmgray-700 block mb-1">
              Donor Handling & Vessel Notes:
            </span>
            <p className="text-warmgray-700">{handlingNotes}</p>
          </div>
        )}

        {/* Handover Timeline Events */}
        <div>
          <h4 className="text-xs font-bold text-warmgray-800 uppercase tracking-wider mb-3">
            Handover Milestones & Inspection Timeline
          </h4>

          {handoverEvents.length === 0 ? (
            <p className="text-xs text-warmgray-500 italic py-2">
              No collection or delivery handovers recorded yet. Awaiting pickup dispatch.
            </p>
          ) : (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-warmgray-200">
              {handoverEvents.map((ev) => (
                <div key={ev.id} className="relative flex items-start gap-4 pl-8">
                  <div className={`absolute left-1.5 top-1 w-3.5 h-3.5 rounded-full border-2 bg-white ${ev.stage === "COLLECTION" ? "border-brand-600" : "border-emerald-700"}`} />
                  <div className="bg-warmgray-50 p-3 rounded-lg border border-warmgray-200 w-full text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-warmgray-900 flex items-center gap-1.5">
                        {ev.stage === "COLLECTION" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        Handover Confirmed: {ev.stage}
                      </span>
                      <span className="text-warmgray-500 text-[11px]">
                        {formatTime(ev.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-medium">
                      <span className="text-emerald-700 font-semibold">
                        Verified: {ev.verifiedQuantity} units
                      </span>
                      {ev.rejectedQuantity && ev.rejectedQuantity > 0 ? (
                        <span className="text-rose-700 font-semibold flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Rejected: {ev.rejectedQuantity} units
                        </span>
                      ) : null}
                    </div>

                    {ev.rejectionReason && (
                      <p className="text-rose-800 bg-rose-50 p-1.5 rounded border border-rose-200">
                        <strong>Rejection Reason:</strong> {ev.rejectionReason}
                      </p>
                    )}

                    {ev.inspectionNotes && (
                      <p className="text-warmgray-700">
                        <strong>Inspection notes:</strong> {ev.inspectionNotes}
                      </p>
                    )}

                    {ev.foodSafetyFlagged && (
                      <div className="bg-rose-100/70 border border-rose-300 p-2 rounded text-rose-900 font-medium flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-700 flex-shrink-0" />
                        <span>Concern Flagged: {ev.foodSafetyNotes || "Safety concern reported to admin."}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mandatory Disclaimer */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-950 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>
            <strong>Disclaimer:</strong> Handling information is provided by participants.
            The app does not certify food safety, legal compliance, or chemical shelf life.
          </span>
        </div>
      </div>
    </div>
  );
}

