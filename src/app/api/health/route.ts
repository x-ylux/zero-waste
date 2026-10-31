import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: true,
    app: "RescueRelay",
    mode: "mock-localStorage-demo",
    persistence: "client mock repository (PostgreSQL adapter available when configured)",
  });
}
