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
  state: AppState;
  user: User;
  setUserId: (id: string) => void;
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
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((kind: ToastItem["kind"], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((current) => [...current, { id, kind, text }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  useEffect(() => {
    const persisted = readPersistedState();
    const next = expireStaleListings(persisted ?? createSeedState());
    setState(next);
    persistState(next);
    const savedUser = window.localStorage.getItem(DEMO_ROLE_KEY);
    if (savedUser && next.users.some((user) => user.id === savedUser)) {
      setUserIdState(savedUser);
    }
    setReady(true);
  }, []);

  const setUserId = useCallback((id: string) => {
    setUserIdState(id);
    window.localStorage.setItem(DEMO_ROLE_KEY, id);
  }, []);

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
      state,
      user,
      setUserId,
      apply,
      resetDemo: () => {
        clearPersistedState();
        const fresh = createSeedState();
        commit(fresh);
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
    [apply, commit, pushToast, ready, setUserId, state, toasts, user]
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
