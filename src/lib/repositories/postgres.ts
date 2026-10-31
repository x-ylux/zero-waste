import type { Prisma } from "@prisma/client";
import type { AppState } from "@/lib/domain/types";
import type { RescueRepository } from "@/lib/repositories/types";

/**
 * Relational adapter for the RescueRelay schema in prisma/schema.prisma.
 * Demo mode never instantiates this class. Wire it from server route handlers
 * after DATABASE_URL and PostGIS migrations are available.
 */
export class PostgresRescueRepository implements RescueRepository {
  readonly mode = "postgres" as const;

  async load(): Promise<AppState> {
    if (!process.env.DATABASE_URL) {
      throw new Error("PostgreSQL mode requires DATABASE_URL. Use mock/localStorage demo mode instead.");
    }
    const { prisma } = await import("@/lib/db/prisma");
    const snapshot = await prisma.appSnapshot.findUnique({ where: { id: "default" } });
    if (!snapshot) {
      throw new Error("No application snapshot found. Run migrations and seed the database.");
    }
    return snapshot.state as unknown as AppState;
  }

  async save(state: AppState): Promise<void> {
    if (!process.env.DATABASE_URL) {
      throw new Error("PostgreSQL mode requires DATABASE_URL.");
    }
    const { prisma } = await import("@/lib/db/prisma");
    const payload = state as unknown as Prisma.InputJsonValue;
    await prisma.appSnapshot.upsert({
      where: { id: "default" },
      update: { state: payload, updatedAt: new Date() },
      create: { id: "default", state: payload },
    });
  }
}

export function isPostgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.RESCUE_RELAY_PERSISTENCE === "postgres");
}
