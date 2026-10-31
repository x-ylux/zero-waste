"use client";

import { ToastStack } from "@/components/ui/ToastStack";
import { DEMO_PERSONAS } from "@/lib/data/seed";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useDemo } from "@/components/providers/DemoProvider";
import { classNames } from "@/lib/format";
import {
  Bell,
  HeartHandshake,
  LayoutDashboard,
  MapPinned,
  Menu,
  QrCode,
  RotateCcw,
  Shield,
  Truck,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const NAV = {
  donor: [
    { href: "/donor", label: "Donor dashboard", icon: LayoutDashboard },
    { href: "/donor/new", label: "Create donation", icon: UtensilsCrossed },
  ],
  ngo: [
    { href: "/ngo", label: "Find donations", icon: HeartHandshake },
    { href: "/ngo/needs", label: "Needs request", icon: MapPinned },
  ],
  volunteer: [
    { href: "/volunteer", label: "Pickup tasks", icon: Truck },
    { href: "/volunteer/on-my-way", label: "On My Way", icon: MapPinned },
  ],
  admin: [
    { href: "/admin", label: "Operations", icon: Shield },
    { href: "/admin/impact", label: "Impact & failures", icon: LayoutDashboard },
  ],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, setUserId, state, resetDemo, ready } = useDemo();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const unread = state.notifications.filter((item) => item.userId === user.id && !item.read).length;
  const links = NAV[user.role];
  const personas = DEMO_PERSONAS;
  const roleHome = {
    donor: "/donor",
    ngo: "/ngo",
    volunteer: "/volunteer",
    admin: "/admin",
  } as const;

  function switchDemoAccount(userId: string, role: keyof typeof roleHome) {
    setUserId(userId);
    setOpen(false);
    router.push(roleHome[role]);
  }

  const extraVolunteer = useMemo(
    () => state.users.find((item) => item.id === "user-vol-priya"),
    [state.users]
  );

  return (
    <div className="min-h-screen bg-cream-50 text-warmgray-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="flex min-h-screen">
        <aside
          className={classNames(
            "fixed inset-y-0 left-0 z-40 w-72 border-r border-cream-200 bg-white/95 p-4 shadow-sm backdrop-blur transition-transform lg:static lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="mb-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold text-brand-800">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">RR</span>
              RescueRelay
            </Link>
            <button type="button" className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-warmgray-500">Demo role switcher</p>
          <div className="space-y-2" role="listbox" aria-label="Demo role">
            {personas.map((persona) => {
              const active = user.id === persona.userId;
              return (
                <button
                  key={persona.userId}
                  type="button"
                  disabled={!ready}
                  onClick={() => switchDemoAccount(persona.userId, persona.role)}
                  className={classNames(
                    "w-full rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-wait disabled:opacity-60",
                    active ? "border-brand-600 bg-brand-50 text-brand-800" : "border-cream-200 bg-cream-50 hover:border-brand-300"
                  )}
                >
                  <span className="block font-semibold">{persona.label}</span>
                  <span className="block text-xs text-warmgray-600">{persona.subtitle}</span>
                </button>
              );
            })}
          </div>
          {user.role === "volunteer" && extraVolunteer && (
            <button
              type="button"
              disabled={!ready}
              onClick={() => switchDemoAccount(extraVolunteer.id, "volunteer")}
              className="mt-2 w-full rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-left text-xs text-amber-950"
            >
              Demo: continue as {extraVolunteer.name} (standby)
            </button>
          )}
          <nav className="mt-6 space-y-1" aria-label="Primary">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={classNames(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
                    active ? "bg-brand-600 text-white" : "text-warmgray-700 hover:bg-cream-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-warmgray-700 hover:bg-cream-100"
            >
              <Bell className="h-4 w-4" />
              Notifications
              {unread > 0 && (
                <span className="ml-auto rounded-full bg-amber-500 px-2 text-xs font-semibold text-white">{unread}</span>
              )}
            </Link>
          </nav>
          <button
            type="button"
            onClick={resetDemo}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 text-sm font-medium text-warmgray-800 hover:bg-white"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Demo Data
          </button>
          <p className="mt-3 text-[11px] leading-relaxed text-warmgray-500">
            Demonstration only — not production authentication. Mock repository with localStorage. Simulated notices are labelled.
          </p>
        </aside>
        {open && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-warmgray-900/40 lg:hidden"
            aria-label="Close navigation overlay"
            onClick={() => setOpen(false)}
          />
        )}
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-cream-200 bg-cream-50/90 px-4 py-3 backdrop-blur">
            <button type="button" className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="text-sm text-warmgray-600">
                Signed in as <span className="font-semibold text-warmgray-900">{user.name}</span> · {user.role}
              </div>
              <ThemeToggle />
            </div>
            <Link href="/qr/don-07" className="hidden items-center gap-1 text-sm text-brand-800 sm:flex">
              <QrCode className="h-4 w-4" /> Sample QR passport
            </Link>
          </header>
          <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {!ready ? <p className="text-sm text-warmgray-600">Loading demo data…</p> : children}
          </main>
        </div>
      </div>
      <ToastStack />
    </div>
  );
}
