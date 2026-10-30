import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { volunteerUserId } = body;

    const allocation = await prisma.allocation.findUnique({
      where: { id: params.id },
      include: {
        donation: true,
      },
    });

    if (!allocation) {
      return NextResponse.json({ error: "Allocation not found." }, { status: 404 });
    }

    if (user.role !== "ADMIN" && user.organisationId !== allocation.ngoOrgId) {
      return NextResponse.json(
        { error: "Only the recipient NGO or admin can assign volunteers." },
        { status: 403 }
      );
    }

    const volunteer = await prisma.user.findUnique({
      where: { id: volunteerUserId },
      include: { volunteerProfile: true },
    });

    if (!volunteer || volunteer.role !== "VOLUNTEER" || !volunteer.volunteerProfile) {
      return NextResponse.json(
        { error: "Invalid volunteer user." },
        { status: 400 }
      );
    }

    if (volunteer.isSuspended || !volunteer.volunteerProfile.isAvailable) {
      return NextResponse.json(
        { error: "Volunteer is unavailable or suspended." },
        { status: 400 }
      );
    }

    // Verify volunteer capacity
    if (volunteer.volunteerProfile.capacityUnit !== allocation.unit) {
      return NextResponse.json(
        {
          error: `Volunteer unit (${volunteer.volunteerProfile.capacityUnit}) does not match allocation unit (${allocation.unit}).`,
        },
        { status: 400 }
      );
    }

    if (volunteer.volunteerProfile.maxCarryingCapacity < allocation.allocatedQuantity) {
      return NextResponse.json(
        {
          error: `Volunteer capacity (${volunteer.volunteerProfile.maxCarryingCapacity}) is less than allocated quantity (${allocation.allocatedQuantity}).`,
        },
        { status: 400 }
      );
    }

    // Deactivate previous active assignments
    await prisma.assignment.updateMany({
      where: { allocationId: allocation.id, isCurrent: true },
      data: { isCurrent: false },
    });

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes offer

    const assignment = await prisma.assignment.create({
      data: {
        allocationId: allocation.id,
        volunteerUserId: volunteer.id,
        status: "OFFERED",
        isCurrent: true,
        offerExpiresAt: expiresAt,
        notes: `Assigned by ${user.name}`,
      },
    });

    await prisma.assignmentOffer.create({
      data: {
        assignmentId: assignment.id,
        volunteerUserId: volunteer.id,
        status: "PENDING",
        expiresAt,
      },
    });

    await prisma.allocation.update({
      where: { id: allocation.id },
      data: { status: "AWAITING_VOLUNTEER" },
    });

    // Notify volunteer
    await prisma.notification.create({
      data: {
        userId: volunteer.id,
        title: "New Volunteer Pickup Offer",
        message: `You have been offered a collection of ${allocation.allocatedQuantity} ${allocation.unit} from ${allocation.donation.pickupAddress}.`,
        type: "OFFER",
        simulatedChannel: "IN_APP",
        metadata: JSON.stringify({ assignmentId: assignment.id, allocationId: allocation.id }),
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorUserId: user.id,
        action: "VOLUNTEER_ASSIGNMENT_OFFERED",
        entityType: "Assignment",
        entityId: assignment.id,
        details: JSON.stringify({
          allocationId: allocation.id,
          volunteerUserId: volunteer.id,
        }),
      },
    });

    return NextResponse.json({ success: true, assignment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to assign volunteer." },
      { status: 500 }
    );
  }
}

