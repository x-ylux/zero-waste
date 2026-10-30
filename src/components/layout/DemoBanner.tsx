"use client";

import React, { useState } from "react";
import { AlertTriangle, Sliders, RefreshCw, X } from "lucide-react";

export function DemoBanner() {
  const [openControls, setOpenControls] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleDemoAction = async (action: string) => {
    setLoadingAction(action);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage(`Error: ${data.error || "Action failed"}`);
      } else {
        setStatusMessage(`Success: ${data.message || JSON.stringify(data.result || "Done")}`);
      }
    } catch (err: any) {
      setStatusMessage(`Network error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <>
      <div className="bg-amber-100 border-b border-amber-300 text-amber-950 px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>
            <strong>Simulated Demo Environment:</strong> Operating with synthetic data for Bengaluru. Food safety certifications, live SMS, and traffic routes are simulated for demonstration.
          </span>
        </div>
        <button
          onClick={() => setOpenControls(true)}
          className="ml-4 px-2.5 py-1 bg-amber-800 text-amber-50 rounded hover:bg-amber-900 transition flex items-center gap-1.5 flex-shrink-0 text-xs shadow-sm font-semibold"
        >
          <Sliders className="w-3.5 h-3.5" /> Demo Controls
        </button>
      </div>

      {openControls && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-warmgray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-warmgray-200 mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-brand-700" />
                <h3 className="text-lg font-bold text-warmgray-900">
                  Admin Demo Control Panel
                </h3>
              </div>
              <button
                onClick={() => setOpenControls(false)}
                className="text-warmgray-400 hover:text-warmgray-600 p-1"
                aria-label="Close demo controls"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-warmgray-600 mb-4">
              Trigger key hackathon demonstration states deterministically. All actions operate on synthetic test entities in Bengaluru.
            </p>

            {statusMessage && (
              <div className={`p-3 rounded-md text-xs mb-4 ${statusMessage.startsWith("Success") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                {statusMessage}
              </div>
            )}

            <div className="space-y-3">
              <div className="p-3 bg-cream-50 rounded-lg border border-cream-200">
                <h4 className="text-xs font-bold text-warmgray-800 uppercase tracking-wider mb-1">
                  Step 1: Stage Campus Split Allocation
                </h4>
                <p className="text-xs text-warmgray-600 mb-2">
                  100 portions from Campus Mess split between NGO Annapurna (60) and Hunger Relief (40). Assigns volunteer Aarav.
                </p>
                <button
                  onClick={() => handleDemoAction("STAGE_SPLIT_ALLOCATION")}
                  disabled={!!loadingAction}
                  className="w-full py-2 bg-brand-700 hover:bg-brand-800 text-white rounded font-medium text-xs flex items-center justify-center gap-2 transition"
                >
                  {loadingAction === "STAGE_SPLIT_ALLOCATION" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Stage 60/40 Split & Assign Volunteer"}
                </button>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <h4 className="text-xs font-bold text-warmgray-800 uppercase tracking-wider mb-1">
                  Step 2: Trigger Volunteer Cancellation
                </h4>
                <p className="text-xs text-warmgray-600 mb-2">
                  Volunteer Aarav cancels due to flat tire. The system preserves history and evaluates backup volunteer (Priya).
                </p>
                <button
                  onClick={() => handleDemoAction("TRIGGER_VOLUNTEER_CANCELLATION")}
                  disabled={!!loadingAction}
                  className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-white rounded font-medium text-xs flex items-center justify-center gap-2 transition"
                >
                  {loadingAction === "TRIGGER_VOLUNTEER_CANCELLATION" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Simulate Aarav Cancellation & Trigger Backup"}
                </button>
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <h4 className="text-xs font-bold text-warmgray-800 uppercase tracking-wider mb-1">
                  Step 3: Backup Volunteer Accepts Offer
                </h4>
                <p className="text-xs text-warmgray-600 mb-2">
                  Backup volunteer Priya accepts the offered collection assignment.
                </p>
                <button
                  onClick={() => handleDemoAction("BACKUP_ACCEPT")}
                  disabled={!!loadingAction}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium text-xs flex items-center justify-center gap-2 transition"
                >
                  {loadingAction === "BACKUP_ACCEPT" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Accept Backup Offer (Priya)"}
                </button>
              </div>

              <div className="p-3 bg-warmgray-50 rounded-lg border border-warmgray-200">
                <h4 className="text-xs font-bold text-warmgray-800 uppercase tracking-wider mb-1">
                  Run Background Recovery Worker
                </h4>
                <p className="text-xs text-warmgray-600 mb-2">
                  Scans for expired volunteer offers, times them out, and dispatches backup offers idempotently.
                </p>
                <button
                  onClick={() => handleDemoAction("RUN_WORKER")}
                  disabled={!!loadingAction}
                  className="w-full py-2 bg-warmgray-800 hover:bg-warmgray-900 text-white rounded font-medium text-xs flex items-center justify-center gap-2 transition"
                >
                  {loadingAction === "RUN_WORKER" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Execute Recovery Worker Now"}
                </button>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-warmgray-200 flex justify-end">
              <button
                onClick={() => setOpenControls(false)}
                className="px-4 py-2 border border-warmgray-300 text-warmgray-700 rounded-lg text-xs font-medium hover:bg-warmgray-50 transition"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
