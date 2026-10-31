"use client";

import { createSeedState, DEMO_PERSONAS } from "@/lib/data/seed";
import {
  acceptTask,
  adminReassignTask,
  cancelDonation,
  cancelTask,
  confirmPickup,
  confirmReceipt,
  createDonation,
  enterRescueMode,
  expireStaleListings,
  rejectDonation,
  reportIncident,
  reserveDonation,
  saveNeeds,
  type DonationInput,
  updateVolunteerProfile,
} from "@/lib/domain/engine";
import type { AppState, EngineOutcome, User, VolunteerProfile } from "@/lib/domain/types";
import type { AuthenticatedAccount } from "@/lib/auth/types";
import {
  clearPersistedState,
  DEMO_ROLE_KEY,
  persistState,
  readPersistedState,
} from "@/lib/repositories/memory";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface ToastItem {
  id: string;
  kind: "success" | "error" | "info";
  text: string;
}

interface DemoContextValue {
  ready: boolean;
  isAuthorized: boolean;
  isDemoSession: boolean;
  state: AppState;
  user: User;
  setUserId: (id: string) => void;
  setAuthenticatedAccount: (account: AuthenticatedAccount) => void;
  logout: () => Promise<boolean>;
  apply: (outcome: EngineOutcome, fallbackError?: string) => boolean;
  resetDemo: () => void;
  createDonation: (input: DonationInput) => boolean;
  cancelDonation: (donationId: string, reason: string) => boolean;
  saveNeeds: (patch: Parameters<typeof saveNeeds>[2]) => boolean;
  reserveDonation: (donationId: string) => boolean;
  rejectDonation: (donationId: string, reason: string) => boolean;
  acceptTask: (taskId: string) => boolean;
  cancelTask: (taskId: string, reason: string) => boolean;
  simulateCancellation: (taskId: string) => boolean;
  confirmPickup: (taskId: string, method: "qr" | "manual") => boolean;
  confirmReceipt: (donationId: string, acceptedQuantity: number) => boolean;
  updateVolunteer: (patch: Parameters<typeof updateVolunteerProfile>[2]) => boolean;
  reassignTask: (taskId: string, volunteerId: string) => boolean;
  reportIncident: (title: string, description: string, donationId?: string) => boolean;
  toasts: ToastItem[];
  dismissToast: (id: string) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => createSeedState());
  const [userId, setUserIdState] = useState(DEMO_PERSONAS[0].userId);
  const [ready, setReady] = useState(false);
  const [isDemoSession, setIsDemoSession] = useState(false);
  const [authenticatedAccount, setAuthenticatedAccountState] = useState<AuthenticatedAccount | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((kind: ToastItem["kind"], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((current) => [...current, { id, kind, text }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
      const persisted = readPersistedState();
      const next = expireStaleListings(persisted ?? createSeedState());

      setState(next);
      persistState(next);
      window.localStorage.removeItem(DEMO_ROLE_KEY);

      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          throw new Error(`Account session check failed with HTTP ${response.status}.`);
        }
        const result = (await response.json()) as {
          account: AuthenticatedAccount | null;
        };
        if (!active) return;

        if (result.account) {
          const account = result.account;
          const merged: AppState = {
            ...next,
            users: [...next.users.filter((item) => item.id !== account.user.id), account.user],
            donors: account.donor
              ? [...next.donors.filter((item) => item.id !== account.donor!.id), account.donor]
              : next.donors,
            ngos: account.ngo
              ? [...next.ngos.filter((item) => item.id !== account.ngo!.id), account.ngo]
              : next.ngos,
            needs: account.needs
              ? [...next.needs.filter((item) => item.id !== account.needs!.id), account.needs]
              : next.needs,
            volunteers: account.volunteer
              ? [...next.volunteers.filter((item) => item.id !== account.volunteer!.id), account.volunteer]
              : next.volunteers,
          };
          setState(merged);
          persistState(merged);
          setUserIdState(account.user.id);
          setAuthenticatedAccountState(account);
          setIsDemoSession(false);
        }
      } catch (error) {
        console.error("Could not check the account session.", error);
        pushToast("error", "Could not check your account session. Please retry or use a demo account.");
      } finally {
        if (active) setReady(true);
      }
    }

    void initialize();
    return () => {
      active = false;
    };
  }, [pushToast]);

  const setUserId = useCallback((id: string) => {
    setUserIdState(id);
    setAuthenticatedAccountState(null);
    setIsDemoSession(true);
    window.localStorage.removeItem(DEMO_ROLE_KEY);
    void fetch("/api/auth/logout", { method: "POST" })
      .then((response) => {
        if (!response.ok) throw new Error(`Demo account switch could not clear the account session (HTTP ${response.status}).`);
      })
      .catch((error: unknown) => console.error("Could not clear the account session before switching to a demo account.", error));
  }, []);

  const setAuthenticatedAccount = useCallback((account: AuthenticatedAccount) => {
    setAuthenticatedAccountState(account);
    setIsDemoSession(false);
    setUserIdState(account.user.id);
    window.localStorage.removeItem(DEMO_ROLE_KEY);
    setState((current) => {
      const next: AppState = {
        ...current,
        users: [...current.users.filter((item) => item.id !== account.user.id), account.user],
        donors: account.donor
          ? [...current.donors.filter((item) => item.id !== account.donor!.id), account.donor]
          : current.donors,
        ngos: account.ngo
          ? [...current.ngos.filter((item) => item.id !== account.ngo!.id), account.ngo]
          : current.ngos,
        needs: account.needs
          ? [...current.needs.filter((item) => item.id !== account.needs!.id), account.needs]
          : current.needs,
        volunteers: account.volunteer
          ? [...current.volunteers.filter((item) => item.id !== account.volunteer!.id), account.volunteer]
          : current.volunteers,
      };
      persistState(next);
      return next;
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        pushToast("error", "Could not sign out. Please try again.");
        return false;
      }
      window.localStorage.removeItem(DEMO_ROLE_KEY);
      setAuthenticatedAccountState(null);
      setIsDemoSession(false);
      setUserIdState(DEMO_PERSONAS[0].userId);
      pushToast("info", "You have signed out.");
      return true;
    } catch (error) {
      console.error("Could not sign out.", error);
      pushToast("error", "Could not sign out. Check your connection and try again.");
      return false;
    }
  }, [pushToast]);

  const commit = useCallback(
    (next: AppState) => {
      setState(next);
      persistState(next);
    },
    []
  );

  const apply = useCallback(
    (outcome: EngineOutcome, fallbackError = "Something went wrong.") => {
      if (!outcome.ok) {
        pushToast("error", outcome.error || fallbackError);
        return false;
      }
      commit(outcome.state);
      pushToast("success", outcome.message);
      return true;
    },
    [commit, pushToast]
  );

  const user = state.users.find((item) => item.id === userId) ?? state.users[0];

  const value = useMemo<DemoContextValue>(
    () => ({
      ready,
      isAuthorized: isDemoSession || authenticatedAccount !== null,
      isDemoSession,
      state,
      user,
      setUserId,
      setAuthenticatedAccount,
      logout,
      apply,
      resetDemo: () => {
        clearPersistedState();
        const fresh = createSeedState();
        commit(fresh);
        setAuthenticatedAccountState(null);
        setUserId(DEMO_PERSONAS[0].userId);
        pushToast("info", "Demo data reset. Pickup windows were regenerated from the current time.");
      },
      createDonation: (input) => apply(createDonation(state, user.id, input)),
      cancelDonation: (donationId, reason) => apply(cancelDonation(state, user.id, donationId, reason)),
      saveNeeds: (patch) => apply(saveNeeds(state, user.id, patch)),
      reserveDonation: (donationId) => apply(reserveDonation(state, user.id, donationId)),
      rejectDonation: (donationId, reason) => apply(rejectDonation(state, user.id, donationId, reason)),
      acceptTask: (taskId) => apply(acceptTask(state, user.id, taskId)),
      cancelTask: (taskId, reason) => apply(cancelTask(state, user.id, taskId, reason)),
      simulateCancellation: (taskId) =>
        apply(enterRescueMode(state, taskId, "Simulated volunteer cancellation (demo control).", new Date(), user.id)),
      confirmPickup: (taskId, method) => apply(confirmPickup(state, user.id, taskId, method)),
      confirmReceipt: (donationId, acceptedQuantity) =>
        apply(confirmReceipt(state, user.id, donationId, acceptedQuantity)),
      updateVolunteer: (patch) => apply(updateVolunteerProfile(state, user.id, patch)),
      reassignTask: (taskId, volunteerId) => apply(adminReassignTask(state, user.id, taskId, volunteerId)),
      reportIncident: (title, description, donationId) =>
        apply(reportIncident(state, user.id, title, description, donationId)),
      toasts,
      dismissToast: (id) => setToasts((current) => current.filter((item) => item.id !== id)),
    }),
    [
      apply,
      authenticatedAccount,
      commit,
      isDemoSession,
      logout,
      pushToast,
      ready,
      setAuthenticatedAccount,
      setUserId,
      state,
      toasts,
      user,
    ]
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used within DemoProvider");
  return value;
}

export function useVolunteer(): VolunteerProfile | undefined {
  const { state, user } = useDemo();
  return state.volunteers.find((item) => item.id === user.volunteerId);
}
