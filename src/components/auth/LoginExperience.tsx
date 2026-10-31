"use client";

import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useDemo } from "@/components/providers/DemoProvider";
import { DEMO_PERSONAS } from "@/lib/data/seed";
import type { AccountRole } from "@/lib/auth/service";
import type { AuthenticatedAccount } from "@/lib/auth/types";
import { ArrowLeft, ArrowRight, KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type AccountMode = "login" | "register";
type CodeChallenge = { challengeId: string; purpose: "verify" | "login" };

const ROLE_HOME = {
  donor: "/donor",
  ngo: "/ngo",
  volunteer: "/volunteer",
  admin: "/admin",
} as const;

async function postJson<T>(url: string, values: object): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(result.error ?? "The request could not be completed.");
  }
  return result;
}

export function LoginExperience() {
  const { ready, isAuthorized, user, setUserId, setAuthenticatedAccount } = useDemo();
  const router = useRouter();
  const [mode, setMode] = useState<AccountMode>("login");
  const [role, setRole] = useState<AccountRole>("donor");
  const [name, setName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [challenge, setChallenge] = useState<CodeChallenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && isAuthorized) router.replace(ROLE_HOME[user.role]);
  }, [isAuthorized, ready, router, user.role]);

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      if (mode === "register") {
        const result = await postJson<CodeChallenge & { message: string }>("/api/auth/register", {
          name,
          organizationName: role === "volunteer" ? undefined : organizationName,
          email,
          password,
          phone,
          address,
          role,
        });
        setChallenge(result);
        setMessage(result.message);
      } else {
        const result = await postJson<CodeChallenge & { message: string }>("/api/auth/login", {
          email,
          password,
        });
        setChallenge(result);
        setMessage(result.message);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The request could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;
    setError("");
    setBusy(true);

    try {
      await postJson<{ ok: boolean }>("/api/auth/verify", {
        challengeId: challenge.challengeId,
        code,
      });
      const response = await fetch("/api/auth/me");
      if (!response.ok) throw new Error("The new account session could not be loaded.");
      const result = (await response.json()) as { account: AuthenticatedAccount | null };
      if (!result.account) throw new Error("The verified account was not returned by the server.");
      setAuthenticatedAccount(result.account);
      router.replace(ROLE_HOME[result.account.user.role]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The code could not be verified.");
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setError("");
    setBusy(true);
    try {
      const result = await postJson<CodeChallenge & { message: string }>("/api/auth/login", {
        email,
        password,
      });
      setChallenge(result);
      setCode("");
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "A new code could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  function chooseDemoAccount(userId: string, accountRole: keyof typeof ROLE_HOME) {
    setUserId(userId);
    router.push(ROLE_HOME[accountRole]);
  }

  function changeMode(nextMode: AccountMode) {
    setMode(nextMode);
    setChallenge(null);
    setError("");
    setMessage("");
  }

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8 text-warmgray-900 sm:py-12">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden space-y-8 lg:block">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 font-bold text-white">RR</span>
            <span className="text-xl font-bold">RescueRelay</span>
          </div>
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-800">Rescue more. Waste less.</p>
            <h1 className="mt-4 text-5xl font-black leading-tight">
              Good food deserves a place at someone&apos;s table.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-warmgray-600">
              Coordinate restaurants, community kitchens, and volunteer couriers in one trusted food-rescue network.
            </p>
          </div>
          <div className="grid max-w-xl grid-cols-3 gap-3 text-sm">
            {["Verified accounts", "Needs-based matching", "Traceable handoffs"].map((item) => (
              <div key={item} className="rounded-2xl border border-cream-200 bg-white p-4 font-medium shadow-sm">
                <ShieldCheck className="mb-3 h-5 w-5 text-brand-700" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-lg">
          <header className="mb-5 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2 font-semibold">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">RR</span>
              RescueRelay
            </div>
            <ThemeToggle />
          </header>
          <article className="rounded-3xl border border-cream-200 bg-white p-5 shadow-panel sm:p-8">
            <div className="mb-6 hidden justify-end lg:flex">
              <ThemeToggle />
            </div>

            {challenge ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setChallenge(null);
                    setCode("");
                    setError("");
                  }}
                  className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-warmgray-600 hover:text-warmgray-900"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to sign in
                </button>
                <MailCheck className="h-9 w-9 text-brand-700" />
                <h2 className="mt-4 text-2xl font-bold">Check your email</h2>
                <p className="mt-2 text-sm leading-relaxed text-warmgray-600">
                  Enter the six-digit verification code sent to <span className="font-semibold text-warmgray-900">{email}</span>.
                  The code expires in 10 minutes.
                </p>
                <form className="mt-6 space-y-4" onSubmit={submitCode}>
                  <label className="block text-sm font-medium" htmlFor="verification-code">
                    Email verification code
                    <input
                      id="verification-code"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="mt-1 w-full rounded-xl border px-3 py-3 text-center text-2xl tracking-[0.4em]"
                      placeholder="000000"
                    />
                  </label>
                  {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
                  {message && <p role="status" className="text-sm text-warmgray-600">{message}</p>}
                  <button
                    type="submit"
                    disabled={busy || code.length !== 6}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "Verifying…" : "Verify and continue"} <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
                <button type="button" disabled={busy} onClick={resendCode} className="mt-4 text-sm font-medium text-brand-800 disabled:opacity-60">
                  Send another code
                </button>
              </>
            ) : (
              <>
                <KeyRound className="h-9 w-9 text-brand-700" />
                <h2 className="mt-4 text-2xl font-bold">
                  {mode === "login" ? "Welcome back" : "Create your account"}
                </h2>
                <p className="mt-2 text-sm text-warmgray-600">
                  {mode === "login"
                    ? "Sign in with your email and password. We’ll email a verification code each time."
                    : "Join the food-rescue network. Verify your email before your first sign-in."}
                </p>

                <div className="mt-6 grid grid-cols-2 rounded-xl bg-cream-100 p-1" role="tablist" aria-label="Account options">
                  {(["login", "register"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="tab"
                      aria-selected={mode === item}
                      onClick={() => changeMode(item)}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition ${
                        mode === item ? "bg-white text-brand-800 shadow-sm" : "text-warmgray-600"
                      }`}
                    >
                      {item === "login" ? "Sign in" : "Register"}
                    </button>
                  ))}
                </div>

                <form className="mt-5 space-y-3" onSubmit={submitCredentials}>
                  {mode === "register" && (
                    <>
                      <label className="block text-sm font-medium">
                        Account type
                        <select
                          value={role}
                          onChange={(event) => setRole(event.target.value as AccountRole)}
                          className="mt-1 w-full rounded-xl border px-3 py-2.5"
                        >
                          <option value="donor">Restaurant / food donor</option>
                          <option value="ngo">NGO / community kitchen</option>
                          <option value="volunteer">Volunteer courier</option>
                        </select>
                      </label>
                      <label className="block text-sm font-medium">
                        Your name
                        <input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" autoComplete="name" />
                      </label>
                      {role !== "volunteer" && (
                        <label className="block text-sm font-medium">
                          Restaurant or organization name
                          <input required minLength={2} maxLength={120} value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" autoComplete="organization" />
                        </label>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-sm font-medium">
                          Phone
                          <input required minLength={7} maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" autoComplete="tel" />
                        </label>
                        <label className="block text-sm font-medium">
                          Bengaluru address
                          <input required minLength={3} maxLength={200} value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" autoComplete="street-address" />
                        </label>
                      </div>
                    </>
                  )}
                  <label className="block text-sm font-medium">
                    Email
                    <input required type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                  </label>
                  <label className="block text-sm font-medium">
                    Password
                    <input
                      required
                      type="password"
                      minLength={mode === "register" ? 12 : 1}
                      maxLength={128}
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="mt-1 w-full rounded-xl border px-3 py-2.5"
                    />
                    {mode === "register" && <span className="mt-1 block text-xs font-normal text-warmgray-500">Use at least 12 characters.</span>}
                  </label>
                  {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
                  {message && <p role="status" className="text-sm text-warmgray-600">{message}</p>}
                  <button
                    type="submit"
                    disabled={busy || !ready}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "Please wait…" : mode === "login" ? "Continue to email verification" : "Register and verify email"}
                    {!busy && <ArrowRight className="h-4 w-4" />}
                  </button>
                </form>
                <p className="mt-4 text-xs leading-relaxed text-warmgray-500">
                  Account registration requires the configured database and email verification service. Demo accounts below work without either.
                </p>
              </>
            )}
          </article>

          {!challenge && (
            <section className="mt-5 rounded-2xl border border-cream-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Explore with a demo account</h3>
                  <p className="mt-1 text-xs text-warmgray-600">Demo accounts skip email verification and use sample data.</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">DEMO</span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {DEMO_PERSONAS.map((persona) => (
                  <button
                    key={persona.userId}
                    type="button"
                    disabled={!ready}
                    onClick={() => chooseDemoAccount(persona.userId, persona.role)}
                    className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-3 text-left transition hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50"
                  >
                    <span className="block text-sm font-semibold">{persona.label}</span>
                    <span className="mt-0.5 block text-xs text-warmgray-600">{persona.subtitle}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
