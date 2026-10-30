import React from "react";
import Link from "next/link";
import { ShieldCheck, Info } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-warmgray-900 text-warmgray-300 border-t border-warmgray-800 py-10 mt-16 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <span className="font-extrabold text-xl text-white tracking-tight">
              Rescue<span className="text-brand-400">Plate</span>
            </span>
            <p className="mt-3 text-warmgray-400 text-xs leading-relaxed max-w-md">
              A capacity-aware surplus food redistribution platform connecting verified donors,
              NGOs, and volunteers. Built with deterministic rule-based matching, transactional
              split allocation, and durable pickup failure recovery.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-amber-300/90 bg-amber-950/40 border border-amber-800/60 p-2.5 rounded-lg max-w-lg">
              <Info className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>
                Handling information is entered by participants. The platform does not certify
                food safety, legal compliance, or shelf life.
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Platform Modules
            </h4>
            <ul className="space-y-2 text-xs text-warmgray-400">
              <li>
                <Link href="/donor" className="hover:text-brand-300 transition">
                  Food Donor Portal
                </Link>
              </li>
              <li>
                <Link href="/ngo/discover" className="hover:text-brand-300 transition">
                  NGO Discovery & Allocation
                </Link>
              </li>
              <li>
                <Link href="/volunteer/assignments" className="hover:text-brand-300 transition">
                  Volunteer Operations
                </Link>
              </li>
              <li>
                <Link href="/impact" className="hover:text-brand-300 transition">
                  Reconciled Impact Metrics
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-brand-300 transition">
                  Audit & Verifications
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Demonstration Disclosures
            </h4>
            <ul className="space-y-1.5 text-xs text-warmgray-400">
              <li>• City: Bengaluru (Synthetic demo data)</li>
              <li>• Notifications: Simulated in-app records</li>
              <li>• Distance: Straight-line adapter fallback</li>
              <li>• Emissions: Default to uncalculated</li>
              <li>• Verification: Hashed server-side OTP</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-warmgray-800 flex flex-col md:flex-row items-center justify-between text-xs text-warmgray-500 gap-4">
          <p>© 2026 RescuePlate. Open-source hackathon prototype. All timestamps in Asia/Kolkata.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Docker PostGIS Connected
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

