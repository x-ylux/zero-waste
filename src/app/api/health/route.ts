import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const postgresEnabled =
    process.env.RESCUE_RELAY_PERSISTENCE === "postgres" && Boolean(process.env.DATABASE_URL);
  let postgresAvailable = false;
  if (postgresEnabled) {
    try {
      const { prisma } = await import("@/lib/db/prisma");
      await prisma.$queryRaw`SELECT 1`;
      postgresAvailable = true;
    } catch (error) {
      console.error("Health check could not reach PostgreSQL.", error);
    }
  }
  return NextResponse.json({
    ok: true,
    app: "RescueRelay",
    mode: postgresAvailable ? "postgres-backed-demo" : "mock-localStorage-demo",
    persistence: postgresAvailable ? "PostgreSQL + PostGIS" : "client mock/localStorage",
    postgresAvailable,
  });
}
