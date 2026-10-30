import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { HandoverService } from "@/lib/handover/service";
import { verifyOtpHandoverSchema } from "@/lib/validation/handover";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const validated = verifyOtpHandoverSchema.parse({
      allocationId: params.id,
      stage: body.stage,
      otp: body.otp,
      verifiedQuantity: body.verifiedQuantity,
      rejectedQuantity: body.rejectedQuantity ?? 0,
      rejectionReason: body.rejectionReason,
      inspectionNotes: body.inspectionNotes,
      foodSafetyFlagged: body.foodSafetyFlagged ?? false,
      foodSafetyNotes: body.foodSafetyNotes,
    });

    const result = await HandoverService.verifyChallenge({
      ...validated,
      actorUserId: user.id,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.errors) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || "Verification failed." },
      { status: 400 }
    );
  }
}

