import React from "react";
import { calculateImpactMetrics } from "@/lib/impact/calculator";
import {
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertTriangle,
  Info,
  Scale,
  Utensils,
  Leaf,
} from "lucide-react";

export default async function ImpactDashboardPage() {
  const metrics = await calculateImpactMetrics();

  return (
    <div className="space-y-8 py-2">
      <div className="pb-4 border-b border-warmgray-200">
        <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
          Audited Operational Accountability
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-warmgray-900 tracking-tight">
          Surplus Redistribution & Handover Metrics
        </h1>
        <p className="text-xs text-warmgray-600 mt-1 max-w-2xl">
          Unlike vanity dashboards that count raw listings as meals saved, RescuePlate calculates metrics strictly from verified collection and delivery handover events.
        </p>
      </div>

      {/* Primary Reconciliation Grid (Separate Unit Accounting) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-warmgray-900 uppercase tracking-wider flex items-center gap-2">
            <Scale className="w-4 h-4 text-brand-700" />
            1. Verified Inventory Flow by Unit (Zero Cross-Unit Addition)
          </h2>
          <span className="text-[11px] text-warmgray-500 font-medium">
            Servings and Kilograms tracked independently
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Servings Card */}
          <div className="bg-white p-6 rounded-2xl border border-warmgray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-warmgray-100">
              <span className="font-bold text-sm text-warmgray-900 flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-brand-700" /> Portioned Meals (SERVINGS)
              </span>
              <span className="text-xs font-semibold text-brand-800 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                Unit: Servings
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-cream-50 rounded-xl border border-cream-200">
                <span className="text-[10px] font-bold text-warmgray-500 uppercase block mb-1">
                  Listed by Donors
                </span>
                <span className="text-xl font-extrabold text-warmgray-900">
                  {metrics.totalListedQuantityByUnit["SERVINGS"] || 0}
                </span>
              </div>

              <div className="p-3 bg-cream-50 rounded-xl border border-cream-200">
                <span className="text-[10px] font-bold text-warmgray-500 uppercase block mb-1">
                  Allocated to NGOs
                </span>
                <span className="text-xl font-extrabold text-brand-700">
                  {metrics.totalAllocatedQuantityByUnit["SERVINGS"] || 0}
                </span>
              </div>

              <div className="p-3 bg-cream-50 rounded-xl border border-cream-200">
                <span className="text-[10px] font-bold text-warmgray-500 uppercase block mb-1">
                  Handover Collected
                </span>
                <span className="text-xl font-extrabold text-purple-700">
                  {metrics.totalCollectedQuantityByUnit["SERVINGS"] || 0}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                  Delivered Accepted
                </span>
                <span className="text-xl font-extrabold text-emerald-700">
                  {metrics.totalDeliveredAcceptedByUnit["SERVINGS"] || 0}
                </span>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-[10px] font-bold text-rose-800 uppercase block mb-1">
                  Delivered Rejected
                </span>
                <span className="text-xl font-extrabold text-rose-700">
                  {metrics.totalDeliveredRejectedByUnit["SERVINGS"] || 0}
                </span>
              </div>

              <div className="p-3 bg-warmgray-50 rounded-xl border border-warmgray-200">
                <span className="text-[10px] font-bold text-warmgray-600 uppercase block mb-1">
                  Uncollected
                </span>
                <span className="text-xl font-extrabold text-warmgray-700">
                  {metrics.totalUncollectedQuantityByUnit["SERVINGS"] || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Kilograms Card */}
          <div className="bg-white p-6 rounded-2xl border border-warmgray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-warmgray-100">
              <span className="font-bold text-sm text-warmgray-900 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-brand-700" /> Bulk Produce & Groceries (KG)
              </span>
              <span className="text-xs font-semibold text-brand-800 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                Unit: Kilograms
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-cream-50 rounded-xl border border-cream-200">
                <span className="text-[10px] font-bold text-warmgray-500 uppercase block mb-1">
                  Listed by Donors
                </span>
                <span className="text-xl font-extrabold text-warmgray-900">
                  {metrics.totalListedQuantityByUnit["KG"] || 0}
                </span>
              </div>

              <div className="p-3 bg-cream-50 rounded-xl border border-cream-200">
                <span className="text-[10px] font-bold text-warmgray-500 uppercase block mb-1">
                  Allocated to NGOs
                </span>
                <span className="text-xl font-extrabold text-brand-700">
                  {metrics.totalAllocatedQuantityByUnit["KG"] || 0}
                </span>
              </div>

              <div className="p-3 bg-cream-50 rounded-xl border border-cream-200">
                <span className="text-[10px] font-bold text-warmgray-500 uppercase block mb-1">
                  Handover Collected
                </span>
                <span className="text-xl font-extrabold text-purple-700">
                  {metrics.totalCollectedQuantityByUnit["KG"] || 0}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                  Delivered Accepted
                </span>
                <span className="text-xl font-extrabold text-emerald-700">
                  {metrics.totalDeliveredAcceptedByUnit["KG"] || 0}
                </span>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-[10px] font-bold text-rose-800 uppercase block mb-1">
                  Delivered Rejected
                </span>
                <span className="text-xl font-extrabold text-rose-700">
                  {metrics.totalDeliveredRejectedByUnit["KG"] || 0}
                </span>
              </div>

              <div className="p-3 bg-warmgray-50 rounded-xl border border-warmgray-200">
                <span className="text-[10px] font-bold text-warmgray-600 uppercase block mb-1">
                  Uncollected
                </span>
                <span className="text-xl font-extrabold text-warmgray-700">
                  {metrics.totalUncollectedQuantityByUnit["KG"] || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Efficiency & Reliability */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-warmgray-900 uppercase tracking-wider flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-brand-700" />
          2. Volunteer Recovery & Pickup Completion Rate
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-warmgray-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-warmgray-500 uppercase block">
              Pickup Completion Rate
            </span>
            <span className="text-3xl font-black text-brand-700">
              {metrics.pickupCompletionRatePercent !== null
                ? `${metrics.pickupCompletionRatePercent}%`
                : "N/A"}
            </span>
            <span className="text-[11px] text-warmgray-500 block pt-1">
              Denominator shown: {metrics.pickupCompletionRateNumerator} of{" "}
              {metrics.pickupCompletionRateDenominator} scheduled allocations
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-warmgray-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-warmgray-500 uppercase block">
              Median Collection Time
            </span>
            <span className="text-3xl font-black text-warmgray-900">
              {metrics.medianCollectionTimeMinutes !== null
                ? `${metrics.medianCollectionTimeMinutes} mins`
                : "N/A"}
            </span>
            <span className="text-[11px] text-warmgray-500 block pt-1">
              From allocation acceptance to physical collection
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-warmgray-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-warmgray-500 uppercase block">
              Recovered by Backup
            </span>
            <span className="text-3xl font-black text-emerald-700">
              {metrics.assignmentsRecoveredThroughBackupCount}
            </span>
            <span className="text-[11px] text-warmgray-500 block pt-1">
              Rescued after initial volunteer dropout
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-warmgray-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-warmgray-500 uppercase block">
              Failed Assignment Offers
            </span>
            <span className="text-3xl font-black text-amber-700">
              {metrics.failedAssignmentsCount}
            </span>
            <span className="text-[11px] text-warmgray-500 block pt-1">
              Timed out, declined, or cancelled offers
            </span>
          </div>
        </div>
      </div>

      {/* Environmental Emissions Card with Strict Disclosures */}
      <div className="bg-white p-6 rounded-2xl border border-warmgray-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-warmgray-100">
          <span className="font-bold text-sm text-warmgray-900 flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-600" />
            3. Environmental Impact (CO2 Avoided)
          </span>
          <span className="text-xs font-bold text-warmgray-600">
            {metrics.co2AvoidedKg !== null
              ? `${metrics.co2AvoidedKg} kg CO2e (Estimated)`
              : "Not calculated"}
          </span>
        </div>

        <div className="p-4 bg-warmgray-50 rounded-xl border border-warmgray-200 text-xs text-warmgray-700 space-y-2">
          <p className="font-medium">{metrics.co2CalculationNotes}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-warmgray-500">
            <Info className="w-3.5 h-3.5 flex-shrink-0 text-warmgray-400" />
            <span>
              RescuePlate prohibits unexplained universal emission multipliers. Emissions are marked as uncalculated unless certified lifecycle factors and verified food-type weights are available.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

