import { NextResponse } from "next/server";
import { calculateImpactMetrics } from "@/lib/impact/calculator";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const donorOrgId = searchParams.get("donorOrgId") || undefined;

    const metrics = await calculateImpactMetrics(donorOrgId);
    return NextResponse.json({ metrics });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to calculate impact metrics." },
      { status: 500 }
    );
  }
}

