import { NextRequest, NextResponse } from "next/server";
import { createSeedState, DEMO_STATE_VERSION } from "@/lib/data/seed";
import { PostgresRescueRepository } from "@/lib/repositories/postgres";
import type { AppState } from "@/lib/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_STATE_BYTES = 15 * 1024 * 1024;
const appStateKeys = [
  "users",
  "donors",
  "ngos",
  "needs",
  "volunteers",
  "donations",
  "tasks",
  "handoffs",
  "timeline",
  "notifications",
  "incidents",
  "failures",
] as const;

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false;
  const state = value as Record<string, unknown>;
  return (
    state.version === DEMO_STATE_VERSION &&
    typeof state.generatedAt === "string" &&
    appStateKeys.every((key) => Array.isArray(state[key]))
  );
}

function unavailableResponse() {
  return NextResponse.json({ error: "PostgreSQL persistence is not configured." }, { status: 503 });
}

export async function GET() {
  if (process.env.RESCUE_RELAY_PERSISTENCE !== "postgres" || !process.env.DATABASE_URL) {
    return unavailableResponse();
  }

  try {
    const repository = new PostgresRescueRepository();
    let state: AppState;
    try {
      state = await repository.load();
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("No application snapshot found")) {
        throw error;
      }
      state = createSeedState();
      await repository.save(state);
    }
    return NextResponse.json({ state, persistence: repository.mode });
  } catch (error) {
    console.error("Could not load persisted demo state.", error);
    return NextResponse.json({ error: "Could not load demo data from PostgreSQL." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (process.env.RESCUE_RELAY_PERSISTENCE !== "postgres" || !process.env.DATABASE_URL) {
    return unavailableResponse();
  }

  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "Cross-origin state updates are not allowed." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_STATE_BYTES) {
    return NextResponse.json({ error: "The demo state payload is too large." }, { status: 413 });
  }

  try {
    const state: unknown = await request.json();
    if (!isAppState(state)) {
      return NextResponse.json({ error: "The submitted demo state is invalid." }, { status: 400 });
    }
    const repository = new PostgresRescueRepository();
    await repository.save(state);
    return NextResponse.json({ ok: true, persistence: repository.mode });
  } catch (error) {
    console.error("Could not persist demo state.", error);
    return NextResponse.json({ error: "Could not save demo data to PostgreSQL." }, { status: 500 });
  }
}
