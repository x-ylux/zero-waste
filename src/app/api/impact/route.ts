import { createSeedState } from "@/lib/data/seed";
import { calculateImpact } from "@/lib/domain/impact";
import { NextResponse } from "next/server";

export async function GET() {
  const impact = calculateImpact(createSeedState().donations);
  return NextResponse.json({
    impact,
    label: impact.label,
    note: "Seed snapshot only. The live demo dashboard reads accepted quantities from localStorage state.",
  });
}
