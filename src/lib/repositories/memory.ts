import { createSeedState, DEMO_STATE_VERSION } from "@/lib/data/seed";
import { expireStaleListings } from "@/lib/domain/engine";
import type { AppState } from "@/lib/domain/types";
import type { RescueRepository } from "@/lib/repositories/types";

export const DEMO_STORAGE_KEY = "rescuerelay.demo.state";
export const DEMO_ROLE_KEY = "rescuerelay.demo.user";

export class MemoryRescueRepository implements RescueRepository {
  readonly mode = "mock" as const;
  private state: AppState;

  constructor(initial?: AppState) {
    this.state = expireStaleListings(initial ?? createSeedState());
  }

  async load(): Promise<AppState> {
    return structuredClone(this.state);
  }

  async save(state: AppState): Promise<void> {
    this.state = structuredClone(state);
  }
}

export function readPersistedState(): AppState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== DEMO_STATE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistState(state: AppState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
}

export function clearPersistedState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEMO_STORAGE_KEY);
}
