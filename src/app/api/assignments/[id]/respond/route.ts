import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import { RecoveryWorker } from "@/lib/recovery/worker";
import {
  assertAllocationTransition,
  assertAssignmentTransition,
} from "@/lib/domain/status-transitions";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { action } = body; // "ACCEPT" | "DECLINE"

    if (action !== "ACCEPT" && action !== "DECLINE") {
      return NextResponse.json(
        { error: "Invalid action. Must be ACCEPT or DECLINE." },
        { status: 400 }
      );
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: params.id },
      include: {
        allocation: true,
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    if (assignment.volunteerUserId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized to respond to this assignment." },
        { status: 403 }
      );
    }

    if (assignment.status !== "OFFERED") {
      return NextResponse.json(
        { error: `Assignment is in '${assignment.status}' state and cannot be accepted/declined.` },
        { status: 400 }
      );
    }

    if (action === "ACCEPT") {
      assertAssignmentTransition(assignment.status, "ACCEPTED");
      assertAllocationTransition(assignment.allocation.status, "ASSIGNED");
      await prisma.$transaction(async (tx) => {
        await tx.assignment.update({
          where: { id: assignment.id },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
        });

        await tx.assignmentOffer.updateMany({
          where: { assignmentId: assignment.id, volunteerUserId: user.id },
          data: {
            status: "ACCEPTED",
            respondedAt: new Date(),
          },
        });

        await tx.allocation.update({
          where: { id: assignment.allocationId },
          data: {
            status: "ASSIGNED",
          },
        });

        await tx.auditEvent.create({
          data: {
            actorUserId: user.id,
            action: "VOLUNTEER_ACCEPTED_ASSIGNMENT",
            entityType: "Assignment",
            entityId: assignment.id,
          },
        });
      });

      return NextResponse.json({ success: true, message: "Assignment accepted." });
    } else {
      // DECLINE: preserve history, mark assignment declined, trigger backup search
      assertAssignmentTransition(assignment.status, "DECLINED");
      await prisma.assignment.update({
        where: { id: assignment.id },
        data: {
          status: "DECLINED",
          isCurrent: false,
          failureReason: "Declined by volunteer.",
        },
      });

      await prisma.assignmentOffer.updateMany({
        where: { assignmentId: assignment.id, volunteerUserId: user.id },
        data: {
          status: "DECLINED",
          respondedAt: new Date(),
        },
      });

      await prisma.auditEvent.create({
        data: {
          actorUserId: user.id,
          action: "VOLUNTEER_DECLINED_ASSIGNMENT",
          entityType: "Assignment",
          entityId: assignment.id,
        },
      });

      // Trigger backup reassignment
      await RecoveryWorker.findAndAssignBackupVolunteer(
        assignment.allocationId,
        "Volunteer declined offer."
      );

      return NextResponse.json({
        success: true,
        message: "Assignment declined. System searching for backup volunteer.",
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to process assignment response." },
      { status: 500 }
    );
  }
}
