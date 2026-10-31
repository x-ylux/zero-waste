"use client";

import { useDemo } from "@/components/providers/DemoProvider";
import { calculateImpact } from "@/lib/domain/impact";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { HeartHandshake, Truck, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const { state, resetDemo } = useDemo();
  const impact = calculateImpact(state.donations);
  const available = state.donations.filter((item) => item.status === "available").length;

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Link href="/" className="text-lg font-semibold text-brand-800">
          RescueRelay
        </Link>
        <div className="flex items-center gap-2">
          <nav className="flex gap-1 text-sm sm:gap-3">
            <Link href="/donor" className="rounded-lg px-2 py-2 hover:bg-white/10 sm:px-3">Donor</Link>
            <Link href="/ngo" className="rounded-lg px-2 py-2 hover:bg-white/10 sm:px-3">NGO</Link>
            <Link href="/volunteer" className="rounded-lg px-2 py-2 hover:bg-white/10 sm:px-3">Volunteer</Link>
            <Link href="/admin" className="rounded-lg px-2 py-2 hover:bg-white/10 sm:px-3">Admin</Link>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 pb-16">
        <section className="rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-warmgray-900 p-8 text-white shadow-xl sm:p-12">
          <p className="text-sm uppercase tracking-wide text-brand-200">Bengaluru demo cluster</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
            Move edible surplus to the kitchens that can actually receive it — tonight.
          </h1>
          <p className="mt-4 max-w-2xl text-brand-100">
            RescueRelay matches restaurants, caterers, and campus mess halls with NGO needs, then coordinates volunteers and backup pickups when a runner drops out.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/donor/new" className="rounded-xl bg-brand-400 px-5 py-3 font-semibold text-brand-950">
              Donate Food
            </Link>
            <Link href="/ngo" className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold">
              Find Donations
            </Link>
            <Link href="/volunteer" className="rounded-xl border border-white/30 px-5 py-3 font-semibold">
              Volunteer
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: UtensilsCrossed, title: "1. List surplus", body: "Donors declare quantity, allergens, storage, and a pickup window — not a safety certificate." },
            { icon: HeartHandshake, title: "2. Match to needs", body: "NGOs see deterministic eligibility reasons, then reserve food they can store and serve." },
            { icon: Truck, title: "3. Relay and recover", body: "Volunteers run the corridor. If someone cancels, Rescue Mode pages standby couriers." },
          ].map((step) => (
            <article key={step.title} className="rounded-2xl border border-cream-200 bg-white p-5 shadow-sm">
              <step.icon className="h-6 w-6 text-brand-700" />
              <h2 className="mt-3 font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm text-warmgray-600">{step.body}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Demo impact metrics</h2>
              <p className="text-xs text-warmgray-500">
                {impact.label}. Counted only from NGO-confirmed accepted quantities. Conversion factors live in configuration.
              </p>
            </div>
            <button type="button" onClick={resetDemo} className="text-sm font-medium text-brand-800">
              Reset Demo Data
            </button>
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Active listings", String(available)],
              ["Accepted servings", String(impact.acceptedByUnit.servings)],
              ["Accepted kg", String(impact.acceptedByUnit.kg)],
              ["Completed deliveries", String(impact.completedDeliveries)],
              ["Meal equivalents", impact.estimatedMealEquivalents.toFixed(0)],
              ["Avoided CO2e (kg)", impact.estimatedAvoidedCo2eKg.toFixed(0)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-cream-50 p-3">
                <dt className="text-xs text-warmgray-500">{label}</dt>
                <dd className="text-xl font-bold text-brand-900">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
