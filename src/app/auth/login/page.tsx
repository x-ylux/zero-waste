"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Utensils, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    role: "ADMIN",
    name: "Radha Krishnan",
    org: "RescuePlate Admin",
    email: "admin@rescueplate.org",
    badge: "System Supervisor",
  },
  {
    role: "DONOR",
    name: "Suresh Patil",
    org: "Apex Campus Mess (Koramangala)",
    email: "donor.mess@rescueplate.org",
    badge: "100 Portions Target",
  },
  {
    role: "DONOR",
    name: "Vikram Singhania",
    org: "Grand Pavilion Banquets",
    email: "donor.caterer@rescueplate.org",
    badge: "Banquet Caterer",
  },
  {
    role: "NGO",
    name: "Sister Teresa",
    org: "Annapurna Seva Kendra",
    email: "ngo.annapurna@rescueplate.org",
    badge: "60 Servings Window",
  },
  {
    role: "NGO",
    name: "Devendra Hegde",
    org: "Bengaluru Hunger Relief",
    email: "ngo.hungerrelief@rescueplate.org",
    badge: "40 Servings Window",
  },
  {
    role: "VOLUNTEER",
    name: "Aarav Sharma",
    org: "Primary Two-Wheeler Runner",
    email: "vol.aarav@rescueplate.org",
    badge: "70 Capacity",
  },
  {
    role: "VOLUNTEER",
    name: "Priya Venkatesh",
    org: "Backup Four-Wheeler Runner",
    email: "vol.priya@rescueplate.org",
    badge: "80 Capacity",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("donor.mess@rescueplate.org");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Login failed.");
      } else {
        // Redirect according to user role
        const role = data.user.role;
        if (role === "DONOR") router.push("/donor");
        else if (role === "NGO") router.push("/ngo/discover");
        else if (role === "VOLUNTEER") router.push("/volunteer/assignments");
        else if (role === "ADMIN") router.push("/admin");
        else router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (accEmail: string) => {
    setEmail(accEmail);
    setPassword("Password123!");
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-700 text-white shadow-md mb-2">
          <Utensils className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-warmgray-900 tracking-tight">
          Sign In to RescuePlate
        </h1>
        <p className="text-sm text-warmgray-600 max-w-md mx-auto">
          Database-authenticated sessions with server-side role validation. Use any synthetic persona below for quick hackathon evaluation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Login Form */}
        <div className="md:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-warmgray-200 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-warmgray-900">
            Credentials Login
          </h2>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-warmgray-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-warmgray-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  placeholder="••••••••"
                />
              </div>
              <p className="text-[11px] text-warmgray-500 mt-1">
                Default synthetic password: <code className="font-mono font-semibold">Password123!</code>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-sm font-bold shadow transition flex items-center justify-center gap-2"
            >
              {loading ? "Authenticating..." : "Sign In"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Demo Personas Grid */}
        <div className="md:col-span-7 bg-cream-50/70 p-6 sm:p-8 rounded-2xl border border-cream-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-warmgray-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-brand-700" />
              Quick-Select Synthetic Personas
            </h2>
            <span className="text-[11px] font-semibold text-warmgray-500">
              Click to autofill
            </span>
          </div>

          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <div
                key={acc.email}
                onClick={() => handleQuickSelect(acc.email)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                  email === acc.email
                    ? "bg-white border-brand-500 ring-2 ring-brand-200 shadow-sm"
                    : "bg-white/70 border-warmgray-200 hover:bg-white hover:border-warmgray-300"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-warmgray-900">
                      {acc.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-warmgray-100 text-warmgray-700">
                      {acc.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-warmgray-600 mt-0.5">{acc.org}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] font-semibold text-brand-800 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 block">
                    {acc.badge}
                  </span>
                  <span className="text-[10px] text-warmgray-400 mt-0.5 block truncate max-w-[140px]">
                    {acc.email}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-warmgray-500 italic pt-2">
            Tip: You can also switch personas instantly anytime from the top navigation bar while browsing the app!
          </p>
        </div>
      </div>
    </div>
  );
}

