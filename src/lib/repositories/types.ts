import type { AppState } from "@/lib/domain/types";

/**
 * Persistence boundary. Demo mode uses a localStorage/memory implementation.
 * PostgreSQL + PostGIS can replace it without changing engine functions.
 */
export interface RescueRepository {
  readonly mode: "mock" | "postgres";
  load(): Promise<AppState>;
  save(state: AppState): Promise<void>;
}
