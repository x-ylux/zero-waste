import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { HandoverService } from "@/lib/handover/service";
import { generateOtpChallengeSchema } from "@/lib/validation/handover";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const validated = generateOtpChallengeSchema.parse({
      allocationId: params.id,
      stage: body.stage,
    });

    const result = await HandoverService.generateChallenge({
      allocationId: validated.allocationId,
      stage: validated.stage,
      actorUserId: user.id,
    });

    return NextResponse.json({
      success: true,
      challengeId: result.challengeId,
      expiresAt: result.expiresAt,
      demoCode: result.demoCode,
    });
  } catch (error: any) {
    if (error?.errors) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || "Failed to generate handover challenge." },
      { status: 400 }
    );
  }
}
