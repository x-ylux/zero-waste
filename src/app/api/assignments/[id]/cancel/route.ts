import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { RecoveryWorker } from "@/lib/recovery/worker";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { reason } = body;

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "A cancellation reason of at least 5 characters is mandatory." },
        { status: 400 }
      );
    }

    const backupAssigned = await RecoveryWorker.cancelAssignmentByVolunteer(
      params.id,
      reason,
      user.id
    );

    return NextResponse.json({
      success: true,
      backupAssigned,
      message: backupAssigned
        ? "Assignment cancelled. Backup volunteer successfully found and offered pickup."
        : "Assignment cancelled. No immediate backup within range; escalated to admin.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to cancel assignment." },
      { status: 400 }
    );
  }
}

