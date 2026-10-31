import { createSeedState, DEMO_STATE_VERSION } from "@/lib/data/seed";
import { expireStaleListings } from "@/lib/domain/engine";
import type { AppState } from "@/lib/domain/types";
import type { RescueRepository } from "@/lib/repositories/types";

export const DEMO_STORAGE_KEY = "rescuerelay.demo.state";
export const DEMO_ROLE_KEY = "rescuerelay.demo.user";

function mergeMissingById<T extends { id: string }>(existing: T[], defaults: T[]): T[] {
  const existingIds = new Set(existing.map((item) => item.id));
  return [...existing, ...defaults.filter((item) => !existingIds.has(item.id))];
}

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
    if (parsed.version === "rescuerelay-demo-v2") {
      const seeded = createSeedState();
      return {
        ...parsed,
        version: DEMO_STATE_VERSION,
        users: mergeMissingById(parsed.users, seeded.users),
        ngos: mergeMissingById(
          parsed.ngos.map((ngo) => ({ ...ngo, recipientType: ngo.recipientType ?? "community" })),
          seeded.ngos
        ),
        needs: mergeMissingById(parsed.needs, seeded.needs),
        donations: parsed.donations.map((donation) => ({
          ...donation,
          animalShelterOnly: donation.animalShelterOnly ?? false,
        })),
      };
    }
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
