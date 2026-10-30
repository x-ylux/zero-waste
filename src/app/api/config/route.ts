import { IMPACT_CONFIG } from "@/lib/config/impact";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    mapsEnabled: Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
    impact: IMPACT_CONFIG,
    note: "Server-only secrets are not returned. Google Maps uses a public browser key only when configured.",
  });
}
