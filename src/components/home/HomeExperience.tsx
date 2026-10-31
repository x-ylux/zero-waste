"use client";

import { LocationBoard } from "@/components/maps/LocationBoard";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useDemo } from "@/components/providers/DemoProvider";
import { calculateImpact } from "@/lib/domain/impact";
import { CATEGORY_LABELS, UNIT_LABELS } from "@/lib/domain/labels";
import { ArrowRight, HeartHandshake, Leaf, MapPin, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

export function HomeExperience() {
  const { state, ready, isAuthorized, user } = useDemo();
  const impact = calculateImpact(state.donations);
  const available = state.donations
    .filter((donation) => donation.status === "available")
    .sort((left, right) => left.pickupWindowEnd.localeCompare(right.pickupWindowEnd));
  const acceptedFood = Object.entries(impact.acceptedByUnit)
    .filter(([, quantity]) => quantity > 0)
    .map(([unit, quantity]) => `${quantity} ${UNIT_LABELS[unit as keyof typeof UNIT_LABELS]}`);
  const animalFood = Object.entries(impact.animalAcceptedByUnit)
    .filter(([, quantity]) => quantity > 0)
    .map(([unit, quantity]) => `${quantity} ${UNIT_LABELS[unit as keyof typeof UNIT_LABELS]}`);
  const mapItems = available.map((donation) => ({
    id: donation.id,
    title: donation.title,
    subtitle: `${donation.quantity} ${UNIT_LABELS[donation.unit]} · ${donation.animalShelterOnly ? "animal shelter only" : CATEGORY_LABELS[donation.category]}`,
    point: donation.pickupLocation,
  }));

  return (
    <main className="min-h-screen bg-cream-50 text-warmgray-900">
      <header className="border-b border-cream-200 bg-panel/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 font-bold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">RR</span>
            <span>RescueRelay</span>
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-3">
            <ThemeToggle />
            {isAuthorized ? (
              <Link href={user.role === "donor" ? "/donor" : user.role === "ngo" ? "/ngo" : user.role === "volunteer" ? "/volunteer" : "/admin"} className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
                Open dashboard
              </Link>
            ) : (
              <Link href="/login" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
                Sign in / Register
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className="bg-brand-950 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:py-24">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-200">Rescue more. Waste less.</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
              Good food deserves a place at someone&apos;s table.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-brand-100">
              RescueRelay helps food donors connect surplus with community kitchens and animal shelters through coordinated pickups.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-bold text-warmgray-950 hover:bg-amber-300">
                Join the rescue network <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#available-food" className="rounded-xl border border-white/30 px-5 py-3 font-semibold text-white hover:bg-white/10">
                Browse available food
              </a>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <UtensilsCrossed className="h-6 w-6 text-amber-300" />
              <h2 className="mt-4 font-bold">Food to people</h2>
              <p className="mt-2 text-sm leading-relaxed text-brand-100">Match safe, edible surplus with community kitchens based on their needs.</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <HeartHandshake className="h-6 w-6 text-amber-300" />
              <h2 className="mt-4 font-bold">Food to animals</h2>
              <p className="mt-2 text-sm leading-relaxed text-brand-100">Animal shelters see only listings specifically designated as suitable for animals.</p>
            </article>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:py-14">
        <section aria-label="Rescue impact" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-cream-200 bg-panel p-5 shadow-sm">
            <p className="text-sm text-warmgray-600">Available food listings</p>
            <p className="mt-2 text-3xl font-black text-brand-800">{ready ? available.length : "—"}</p>
          </article>
          <article className="rounded-2xl border border-cream-200 bg-panel p-5 shadow-sm">
            <p className="text-sm text-warmgray-600">Food accepted by community partners</p>
            <p className="mt-2 text-lg font-bold text-brand-800">{acceptedFood.length ? acceptedFood.join(" · ") : "No completed rescues yet"}</p>
          </article>
          <article className="rounded-2xl border border-cream-200 bg-panel p-5 shadow-sm">
            <p className="text-sm text-warmgray-600">Food accepted by animal shelters</p>
            <p className="mt-2 text-lg font-bold text-brand-800">{animalFood.length ? animalFood.join(" · ") : "No completed shelter deliveries yet"}</p>
          </article>
          <article className="rounded-2xl border border-cream-200 bg-panel p-5 shadow-sm">
            <p className="flex items-center gap-2 text-sm text-warmgray-600"><Leaf className="h-4 w-4 text-brand-700" /> Estimated CO₂e avoided</p>
            <p className="mt-2 text-3xl font-black text-brand-800">{impact.estimatedAvoidedCo2eKg.toFixed(1)} kg</p>
            <p className="mt-1 text-xs text-warmgray-500">Illustrative estimate; excludes animal-shelter deliveries.</p>
          </article>
        </section>

        <section id="available-food" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-brand-800"><MapPin className="h-4 w-4" /> Community food board</p>
              <h2 className="mt-1 text-2xl font-bold">Food ready to be rescued</h2>
            </div>
            <Link href="/login" className="text-sm font-semibold text-brand-800 hover:underline">Sign in to coordinate a pickup</Link>
          </div>
          {available.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {available.slice(0, 6).map((donation) => (
                <article key={donation.id} className="rounded-2xl border border-cream-200 bg-panel p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{donation.title}</p>
                      <p className="mt-1 text-sm text-warmgray-600">{donation.quantity} {UNIT_LABELS[donation.unit]} · {CATEGORY_LABELS[donation.category]}</p>
                    </div>
                    {donation.animalShelterOnly && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-950">Animal shelters only</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-warmgray-600">{donation.pickupLocation.address}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-cream-300 bg-panel p-8 text-center text-sm text-warmgray-600">
              {ready ? "No food is currently available. Sign in or explore a demo account to see the rescue workflow." : "Loading food listings…"}
            </p>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Nearby rescue locations</h2>
            <p className="mt-1 text-sm text-warmgray-600">Choose “Use my location” on the map only if you want to share your device location with Google Maps for this view.</p>
          </div>
          <LocationBoard items={mapItems} />
        </section>

        <p className="text-xs leading-relaxed text-warmgray-500">
          Prototype data is stored in this browser. CO₂e is an illustrative estimate based on accepted, delivered food for people; it is not a certified carbon saving.
        </p>
      </div>
    </main>
  );
}
