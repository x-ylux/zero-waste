import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { AllocationService } from "@/lib/allocations/service";
import { cancelAllocationSchema } from "@/lib/validation/allocation";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const validated = cancelAllocationSchema.parse({
      allocationId: params.id,
      reason: body.reason,
    });

    const allocation = await AllocationService.cancelAllocation({
      allocationId: validated.allocationId,
      reason: validated.reason,
      actorUserId: user.id,
    });

    return NextResponse.json({ success: true, allocation });
  } catch (error: any) {
    if (error?.errors) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || "Failed to cancel allocation." },
      { status: 400 }
    );
  }
}

