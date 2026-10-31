"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useDemo } from "@/components/providers/DemoProvider";
import { IMPACT_CONFIG } from "@/lib/config/impact";
import { calculateImpact, failureSuggestions } from "@/lib/domain/impact";
import { FAILURE_LABELS } from "@/lib/domain/labels";
import type { FailureReason } from "@/lib/domain/types";
import { UNIT_LABELS } from "@/lib/domain/labels";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const REASONS: FailureReason[] = [
  "no_volunteer_available",
  "recipient_unavailable",
  "packaging_unavailable",
  "handling_mismatch",
  "donor_cancellation",
  "pickup_window_missed",
  "recipient_rejection",
];

export default function ImpactPage() {
  const { state } = useDemo();
  const impact = calculateImpact(state.donations);
  const counts = Object.fromEntries(REASONS.map((reason) => [reason, state.failures.filter((item) => item.reason === reason).length]));
  const chartData = REASONS.map((reason) => ({
    name: FAILURE_LABELS[reason],
    count: counts[reason],
  }));
  const suggestions = failureSuggestions(counts);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-2xl font-bold">Impact & failure analytics</h1>
        <p className="text-sm text-warmgray-600">
          {impact.label}. Meal equivalents and CO2e use factors in <code>src/lib/config/impact.ts</code>. Units are never added together.
        </p>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["Quantity listed", impact.listedByUnit],
              ["Quantity collected", impact.collectedByUnit],
              ["Quantity accepted", impact.acceptedByUnit],
              ["Animal-shelter quantity accepted", impact.animalAcceptedByUnit],
            ] as const
          ).map(([label, units]) => (
            <article key={label} className="rounded-2xl border border-cream-200 bg-white p-4">
              <h2 className="text-sm font-semibold">{label}</h2>
              <ul className="mt-2 text-sm">
                {(Object.keys(units) as Array<keyof typeof units>).map((unit) => (
                  <li key={unit}>
                    {units[unit]} {UNIT_LABELS[unit]}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl bg-brand-800 p-4 text-white">
            <p className="text-xs uppercase">Completed deliveries</p>
            <p className="text-3xl font-bold">{impact.completedDeliveries}</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs uppercase text-warmgray-500">Estimated meal equivalents</p>
            <p className="text-3xl font-bold text-brand-800">{impact.estimatedMealEquivalents.toFixed(1)}</p>
            <p className="text-xs">Illustrative estimate</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs uppercase text-warmgray-500">Estimated avoided CO2e</p>
            <p className="text-3xl font-bold text-brand-800">{impact.estimatedAvoidedCo2eKg.toFixed(1)} kg</p>
            <p className="text-xs">Not a certified carbon saving</p>
          </article>
        </section>
        <section className="rounded-2xl border border-cream-200 bg-white p-4">
          <h2 className="font-semibold">Failure reasons</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#15803d" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-semibold">Rule-based operational suggestions</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {suggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="text-xs text-warmgray-600">
          <p>Animal-shelter deliveries are tracked separately and excluded from meal-equivalent and CO₂e estimates.</p>
          <p className="mt-2">Assumptions:</p>
          <ul className="list-disc pl-5">
            {IMPACT_CONFIG.assumptions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-2">{IMPACT_CONFIG.sources}</p>
        </section>
      </div>
    </AppShell>
  );
}
