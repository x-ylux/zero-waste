import React from "react";
import Link from "next/link";
import {
  Utensils,
  Split,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  MapPin,
  Calendar,
  Layers,
  Heart,
  Truck,
  Building,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const donationCount = await prisma.donation.count();
  const allocationCount = await prisma.allocation.count();
  const orgCount = await prisma.organisation.count();

  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-warmgray-900 text-white p-8 sm:p-12 lg:p-16 shadow-xl border border-brand-700/40">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-700/50 border border-brand-500/50 text-brand-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Bengaluru Regional Test Cluster Active
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white">
            Redistribute surplus food with <span className="text-brand-300">capacity-aware</span> precision.
          </h1>

          <p className="text-warmgray-300 text-base sm:text-lg leading-relaxed">
            Unlike static listing boards that assume unlimited charity capacity, RescuePlate
            atomically splits surplus batches across real NGO windows, recovers from cancelled
            volunteer pickups, and verifies handover outcomes with cryptographically hashed challenges.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/donor/donations/create"
              className="px-6 py-3.5 bg-brand-500 hover:bg-brand-400 text-warmgray-950 font-bold rounded-xl shadow-lg transition flex items-center gap-2 text-sm"
            >
              List Surplus Food <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/ngo/discover"
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl transition flex items-center gap-2 text-sm"
            >
              NGO Food Discovery
            </Link>
            <Link
              href="/impact"
              className="px-6 py-3.5 bg-warmgray-900/60 hover:bg-warmgray-900/80 border border-warmgray-700 text-warmgray-200 font-medium rounded-xl transition flex items-center gap-2 text-sm"
            >
              Verified Impact Metrics
            </Link>
          </div>
        </div>

        {/* Quick statistics badge */}
        <div className="mt-10 pt-8 border-t border-white/10 grid grid-cols-3 gap-6 max-w-xl text-center sm:text-left">
          <div>
            <span className="block text-2xl sm:text-3xl font-extrabold text-white">
              {donationCount}
            </span>
            <span className="text-xs text-warmgray-400">Tracked Donations</span>
          </div>
          <div>
            <span className="block text-2xl sm:text-3xl font-extrabold text-brand-300">
              {allocationCount}
            </span>
            <span className="text-xs text-warmgray-400">Atomic Allocations</span>
          </div>
          <div>
            <span className="block text-2xl sm:text-3xl font-extrabold text-white">
              {orgCount}
            </span>
            <span className="text-xs text-warmgray-400">Verified Organisations</span>
          </div>
        </div>
      </section>

      {/* 4 Core Architectural Capabilities */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-warmgray-900">
            Engineered for Real-World Operational Constraints
          </h2>
          <p className="text-sm text-warmgray-600">
            Charitable redistribution fails when listings ignore storage limits, volunteers drop out, or unverified deliveries are counted as meals saved.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-warmgray-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-warmgray-900">
              1. Capacity-Aware Matching
            </h3>
            <p className="text-xs text-warmgray-600 leading-relaxed">
              Deterministic rule-based checks: NGO operating hours, declared storage capacity, permitted radius, and food categories. Missing capacity is never treated as unlimited.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-warmgray-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Split className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-warmgray-900">
              2. Transactional Split Allocation
            </h3>
            <p className="text-xs text-warmgray-600 leading-relaxed">
              Enables multiple NGOs to accept portions of large donations (e.g. 100 meals split 60/40) with atomic database locking to prevent concurrent over-booking.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-warmgray-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-warmgray-900">
              3. Durable Failed-Pickup Recovery
            </h3>
            <p className="text-xs text-warmgray-600 leading-relaxed">
              If a volunteer cancels or times out, previous assignment history is preserved, and a database-backed worker automatically evaluates and dispatches a backup volunteer.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-warmgray-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-warmgray-900">
              4. Verified Handover Auditing
            </h3>
            <p className="text-xs text-warmgray-600 leading-relaxed">
              Collection and delivery require 6-digit hashed challenge codes. Quantities accepted and rejected are tracked separately rather than assuming 100% success.
            </p>
          </div>
        </div>
      </section>

      {/* Role Navigation Slices */}
      <section className="bg-cream-100/60 rounded-3xl p-8 border border-cream-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-warmgray-900">
              Participating Stakeholder Journeys
            </h3>
            <p className="text-xs text-warmgray-600">
              Each role has dedicated server-enforced permissions and tailored operational views.
            </p>
          </div>
          <span className="text-xs font-semibold text-brand-800 bg-brand-100 px-3 py-1 rounded-full">
            All 4 Workflows Live
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/donor"
            className="p-5 bg-white rounded-xl border border-warmgray-200 hover:border-brand-500 hover:shadow-md transition space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                Donor Portal
              </span>
              <Building className="w-4 h-4 text-warmgray-400 group-hover:text-brand-600" />
            </div>
            <p className="font-bold text-sm text-warmgray-900">Caterers & Campus Halls</p>
            <p className="text-xs text-warmgray-500">
              Publish batches, set collection windows, monitor split status, and generate collection OTPs.
            </p>
          </Link>

          <Link
            href="/ngo/discover"
            className="p-5 bg-white rounded-xl border border-warmgray-200 hover:border-brand-500 hover:shadow-md transition space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                NGO Portal
              </span>
              <Heart className="w-4 h-4 text-warmgray-400 group-hover:text-brand-600" />
            </div>
            <p className="font-bold text-sm text-warmgray-900">Charity & Shelter Kitchens</p>
            <p className="text-xs text-warmgray-500">
              Declare capacity windows, discover matches within operating hours, and accept split portions.
            </p>
          </Link>

          <Link
            href="/volunteer/assignments"
            className="p-5 bg-white rounded-xl border border-warmgray-200 hover:border-brand-500 hover:shadow-md transition space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                Volunteer Dispatch
              </span>
              <Truck className="w-4 h-4 text-warmgray-400 group-hover:text-brand-600" />
            </div>
            <p className="font-bold text-sm text-warmgray-900">Food Runners</p>
            <p className="text-xs text-warmgray-500">
              Accept pickups matching carrying capacity, verify handovers with donors and shelters.
            </p>
          </Link>

          <Link
            href="/admin"
            className="p-5 bg-white rounded-xl border border-warmgray-200 hover:border-brand-500 hover:shadow-md transition space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                Admin Console
              </span>
              <ShieldCheck className="w-4 h-4 text-warmgray-400 group-hover:text-brand-600" />
            </div>
            <p className="font-bold text-sm text-warmgray-900">Supervisor Oversight</p>
            <p className="text-xs text-warmgray-500">
              Verify legal documents, investigate food safety incidents, and trigger demo recovery states.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
