"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Utensils,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Layers,
  Shield,
  Truck,
  HeartHandshake,
  BarChart3,
  PlusCircle,
} from "lucide-react";

interface NavbarProps {
  currentUser?: {
    id: string;
    email: string;
    name: string;
    role: "DONOR" | "NGO" | "VOLUNTEER" | "ADMIN";
    organisationName?: string | null;
  } | null;
}

const DEMO_PERSONAS = [
  { label: "Admin: Radha Krishnan", email: "admin@rescueplate.org", role: "ADMIN" },
  { label: "Donor: Suresh Patil (Mess Manager)", email: "donor.mess@rescueplate.org", role: "DONOR" },
  { label: "Donor: Vikram Singhania (Head Chef)", email: "donor.caterer@rescueplate.org", role: "DONOR" },
  { label: "NGO: Sister Teresa (Annapurna Kendra)", email: "ngo.annapurna@rescueplate.org", role: "NGO" },
  { label: "NGO: Devendra Hegde (Hunger Relief)", email: "ngo.hungerrelief@rescueplate.org", role: "NGO" },
  { label: "Volunteer: Aarav Sharma (Primary)", email: "vol.aarav@rescueplate.org", role: "VOLUNTEER" },
  { label: "Volunteer: Priya Venkatesh (Backup)", email: "vol.priya@rescueplate.org", role: "VOLUNTEER" },
];

export function Navbar({ currentUser }: NavbarProps) {
  const router = useRouter();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [switchingUser, setSwitchingUser] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (currentUser) {
      fetch("/api/notifications")
        .then((res) => res.json())
        .then((data) => {
          if (data.notifications) {
            const unread = data.notifications.filter((n: any) => !n.isRead).length;
            setUnreadNotifications(unread);
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);

  const handleSwitchPersona = async (email: string) => {
    setSwitchingUser(true);
    try {
      const res = await fetch("/api/auth/switch-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setUserDropdownOpen(false);
        router.refresh();
        window.location.reload();
      }
    } catch (err) {
      console.error("Persona switch failed", err);
    } finally {
      setSwitchingUser(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <nav className="bg-white border-b border-warmgray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-brand-700 flex items-center justify-center text-white shadow-sm">
                <Utensils className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-warmgray-900">
                Rescue<span className="text-brand-700">Plate</span>
              </span>
            </Link>

            {currentUser && (
              <div className="hidden md:flex items-center space-x-1 text-sm font-medium text-warmgray-700">
                {currentUser.role === "DONOR" && (
                  <>
                    <Link
                      href="/donor"
                      className="px-3 py-2 rounded-md hover:text-brand-800 hover:bg-brand-50 transition"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/donor/donations/create"
                      className="px-3 py-2 rounded-md hover:text-brand-800 hover:bg-brand-50 transition flex items-center gap-1.5 text-brand-700 font-semibold"
                    >
                      <PlusCircle className="w-4 h-4" /> Create Donation
                    </Link>
                  </>
                )}

                {currentUser.role === "NGO" && (
                  <>
                    <Link
                      href="/ngo/discover"
                      className="px-3 py-2 rounded-md hover:text-brand-800 hover:bg-brand-50 transition flex items-center gap-1.5"
                    >
                      <Layers className="w-4 h-4" /> Discover Donations
                    </Link>
                    <Link
                      href="/ngo/capacity"
                      className="px-3 py-2 rounded-md hover:text-brand-800 hover:bg-brand-50 transition"
                    >
                      Capacity Settings
                    </Link>
                  </>
                )}

                {currentUser.role === "VOLUNTEER" && (
                  <>
                    <Link
                      href="/volunteer/assignments"
                      className="px-3 py-2 rounded-md hover:text-brand-800 hover:bg-brand-50 transition flex items-center gap-1.5"
                    >
                      <Truck className="w-4 h-4" /> My Assignments
                    </Link>
                    <Link
                      href="/volunteer/availability"
                      className="px-3 py-2 rounded-md hover:text-brand-800 hover:bg-brand-50 transition"
                    >
                      Operating Profile
                    </Link>
                  </>
                )}

                {currentUser.role === "ADMIN" && (
                  <>
                    <Link
                      href="/admin"
                      className="px-3 py-2 rounded-md hover:text-brand-800 hover:bg-brand-50 transition flex items-center gap-1.5"
                    >
                      <Shield className="w-4 h-4" /> Admin Console
                    </Link>
                  </>
                )}

                <Link
                  href="/impact"
                  className="px-3 py-2 rounded-md hover:text-brand-800 hover:bg-brand-50 transition flex items-center gap-1.5"
                >
                  <BarChart3 className="w-4 h-4" /> Operational Impact
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <Link
                  href="/notifications"
                  className="relative p-2 text-warmgray-500 hover:text-warmgray-800 rounded-lg hover:bg-warmgray-100 transition"
                  aria-label="View notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 pl-3 rounded-lg border border-warmgray-300 hover:bg-warmgray-50 text-left transition"
                  >
                    <div>
                      <div className="text-xs font-bold text-warmgray-900 leading-tight">
                        {currentUser.name}
                      </div>
                      <div className="text-[11px] text-warmgray-500 flex items-center gap-1">
                        <span className="font-semibold text-brand-700">
                          {currentUser.role}
                        </span>
                        {currentUser.organisationName && (
                          <span className="truncate max-w-[120px]">
                            • {currentUser.organisationName}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-warmgray-500" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-warmgray-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-4 py-2 border-b border-warmgray-100">
                        <p className="text-xs text-warmgray-500">Signed in as</p>
                        <p className="text-xs font-semibold text-warmgray-900 truncate">
                          {currentUser.email}
                        </p>
                      </div>

                      <div className="px-3 py-2 border-b border-warmgray-100 bg-cream-50">
                        <p className="text-[11px] font-bold text-warmgray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <HeartHandshake className="w-3 h-3 text-brand-700" /> Quick Persona Switcher
                        </p>
                        <div className="space-y-1">
                          {DEMO_PERSONAS.map((p) => (
                            <button
                              key={p.email}
                              onClick={() => handleSwitchPersona(p.email)}
                              disabled={switchingUser || p.email === currentUser.email}
                              className={`w-full text-left px-2 py-1.5 text-xs rounded transition flex items-center justify-between ${
                                p.email === currentUser.email
                                  ? "bg-brand-100 text-brand-900 font-bold"
                                  : "hover:bg-warmgray-100 text-warmgray-800"
                              }`}
                            >
                              <span className="truncate">{p.label}</span>
                              <span className="text-[10px] uppercase font-bold text-warmgray-400">
                                {p.role}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-red-700 hover:bg-red-50 flex items-center gap-2 transition"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-semibold text-warmgray-700 hover:text-warmgray-900 hover:bg-warmgray-100 rounded-lg transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 rounded-lg transition shadow-sm"
                >
                  Demo Log In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

