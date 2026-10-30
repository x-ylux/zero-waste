import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import { AllocationService } from "@/lib/allocations/service";
import { RecoveryWorker } from "@/lib/recovery/worker";
import { HandoverService } from "@/lib/handover/service";
import { QuantityUnit } from "@prisma/client";

export async function POST(req: Request) {
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.json(
      { error: "Demo control panel is disabled in production." },
      { status: 403 }
    );
  }

  try {
    const user = await requireAuth();
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can trigger demo controls." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action === "STAGE_SPLIT_ALLOCATION") {
      // 1. Campus mess donation (donation-demo-campus-100)
      const donation = await prisma.donation.findUnique({
        where: { id: "donation-demo-campus-100" },
        include: { items: true },
      });

      if (!donation || !donation.items[0]) {
        return NextResponse.json(
          { error: "Target demo donation not found. Please run seed script first." },
          { status: 400 }
        );
      }

      const item = donation.items[0];

      // Reset any existing allocations on this demo donation
      await prisma.handoverEvent.deleteMany({
        where: { allocation: { donationId: donation.id } },
      });
      await prisma.handoverChallenge.deleteMany({
        where: { allocation: { donationId: donation.id } },
      });
      await prisma.assignmentOffer.deleteMany({
        where: { assignment: { allocation: { donationId: donation.id } } },
      });
      await prisma.assignment.deleteMany({
        where: { allocation: { donationId: donation.id } },
      });
      await prisma.allocation.deleteMany({
        where: { donationId: donation.id },
      });

      // Reset item quantities and capacity window reservations
      await prisma.donationItem.update({
        where: { id: item.id },
        data: {
          allocatedQuantity: 0,
          collectedQuantity: 0,
          deliveredQuantity: 0,
        },
      });

      await prisma.capacityWindow.updateMany({
        where: { id: { in: ["cw-annapurna-today", "cw-hungerrelief-today"] } },
        data: { reservedCapacity: 0, receivedCapacity: 0 },
      });

      await prisma.donation.update({
        where: { id: donation.id },
        data: { status: "OPEN" },
      });

      // NGO A (Annapurna) accepts 60 portions
      const allocA = await AllocationService.acceptAllocation({
        donationId: donation.id,
        donationItemId: item.id,
        ngoOrgId: "org-ngo-annapurna",
        allocatedQuantity: 60,
        unit: QuantityUnit.SERVINGS,
        capacityWindowId: "cw-annapurna-today",
        actorUserId: user.id,
      });

      // NGO B (Hunger Relief) accepts 40 portions
      const allocB = await AllocationService.acceptAllocation({
        donationId: donation.id,
        donationItemId: item.id,
        ngoOrgId: "org-ngo-hunger-relief",
        allocatedQuantity: 40,
        unit: QuantityUnit.SERVINGS,
        capacityWindowId: "cw-hungerrelief-today",
        actorUserId: user.id,
      });

      // Assign Volunteer 1 (Aarav) to Allocation A
      const aarav = await prisma.user.findUnique({
        where: { email: "vol.aarav@rescueplate.org" },
      });

      const assignA = await prisma.assignment.create({
        data: {
          allocationId: allocA.id,
          volunteerUserId: aarav!.id,
          status: "ACCEPTED",
          isCurrent: true,
          offerExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
          acceptedAt: new Date(),
          notes: "Demo: Aarav accepted initial assignment.",
        },
      });

      await prisma.allocation.update({
        where: { id: allocA.id },
        data: { status: "ASSIGNED" },
      });

      return NextResponse.json({
        success: true,
        message:
          "Demo scenario staged: 100 portions split between NGO A (60) and NGO B (40). Volunteer Aarav assigned.",
        allocationAId: allocA.id,
        allocationBId: allocB.id,
        assignmentAId: assignA.id,
      });
    }

    if (action === "TRIGGER_VOLUNTEER_CANCELLATION") {
      // Find active assignment for Aarav on Allocation A
      const aarav = await prisma.user.findUnique({
        where: { email: "vol.aarav@rescueplate.org" },
      });

      const activeAssign = await prisma.assignment.findFirst({
        where: {
          volunteerUserId: aarav!.id,
          isCurrent: true,
          status: "ACCEPTED",
        },
        include: { allocation: true },
      });

      if (!activeAssign) {
        return NextResponse.json(
          { error: "No active assignment found for volunteer Aarav. Please stage the scenario first." },
          { status: 400 }
        );
      }

      // Volunteer cancels before collection
      const backupAssigned = await RecoveryWorker.cancelAssignmentByVolunteer(
        activeAssign.id,
        "Motorcycle flat tire on Outer Ring Road.",
        aarav!.id
      );

      return NextResponse.json({
        success: true,
        message: backupAssigned
          ? "Volunteer Aarav cancelled. Backup volunteer (Priya) was automatically located within radius and dispatched an offer!"
          : "Volunteer Aarav cancelled. No backup in range; incident escalated to Admin.",
      });
    }

    if (action === "BACKUP_ACCEPT") {
      // Find backup offer for Priya
      const priya = await prisma.user.findUnique({
        where: { email: "vol.priya@rescueplate.org" },
      });

      const offer = await prisma.assignment.findFirst({
        where: {
          volunteerUserId: priya!.id,
          status: "OFFERED",
          isCurrent: true,
        },
      });

      if (!offer) {
        return NextResponse.json(
          { error: "No pending backup offer found for Priya." },
          { status: 400 }
        );
      }

      await prisma.assignment.update({
        where: { id: offer.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });

      await prisma.assignmentOffer.updateMany({
        where: { assignmentId: offer.id },
        data: {
          status: "ACCEPTED",
          respondedAt: new Date(),
        },
      });

      await prisma.allocation.update({
        where: { id: offer.allocationId },
        data: { status: "ASSIGNED" },
      });

      return NextResponse.json({
        success: true,
        message: "Backup volunteer (Priya) accepted the assignment!",
      });
    }

    if (action === "RUN_WORKER") {
      const result = await RecoveryWorker.run();
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: "Unknown demo action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Demo control operation failed." },
      { status: 500 }
    );
  }
}
