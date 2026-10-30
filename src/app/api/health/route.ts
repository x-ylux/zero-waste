import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "RescueRelay",
    persistence: "mock-localStorage",
    postgresConfigured: Boolean(process.env.DATABASE_URL && process.env.RESCUE_RELAY_PERSISTENCE === "postgres"),
  });
}
