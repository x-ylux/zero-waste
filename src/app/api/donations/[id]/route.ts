import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const donation = await prisma.donation.findUnique({
      where: { id: params.id },
      include: {
        donorOrg: true,
        createdByUser: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: true,
        allocations: {
          include: {
            ngoOrg: true,
            assignments: {
              include: {
                volunteer: {
                  select: { id: true, name: true, email: true, phone: true },
                },
              },
            },
            handoverEvents: {
              orderBy: { timestamp: "asc" },
            },
            handoverChallenges: {
              where: { isVerified: false },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!donation) {
      return NextResponse.json({ error: "Donation not found." }, { status: 404 });
    }

    return NextResponse.json({ donation });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch donation." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { action, reason } = body;

    const donation = await prisma.donation.findUnique({
      where: { id: params.id },
      include: { items: true, allocations: true },
    });

    if (!donation) {
      return NextResponse.json({ error: "Donation not found." }, { status: 404 });
    }

    // Permission check
    if (user.role !== "ADMIN" && user.organisationId !== donation.donorOrgId) {
      return NextResponse.json(
        { error: "Access denied to modify this donation." },
        { status: 403 }
      );
    }

    if (action === "CANCEL") {
      if (!reason || reason.trim().length < 5) {
        return NextResponse.json(
          { error: "A cancellation reason of at least 5 characters is mandatory." },
          { status: 400 }
        );
      }

      // Check if any allocation was already collected
      const hasCollected = donation.allocations.some((a) =>
        ["COLLECTED", "DELIVERED", "PARTIALLY_DELIVERED"].includes(a.status)
      );

      if (hasCollected) {
        return NextResponse.json(
          {
            error:
              "Cannot cancel donation because one or more portions have already been collected.",
          },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        // Cancel all uncollected allocations
        for (const alloc of donation.allocations) {
          if (alloc.status !== "CANCELLED") {
            await tx.allocation.update({
              where: { id: alloc.id },
              data: {
                status: "CANCELLED",
                cancellationReason: `Donation cancelled by donor: ${reason}`,
                cancelledAt: new Date(),
              },
            });
          }
        }

        // Cancel donation
        await tx.donation.update({
          where: { id: donation.id },
          data: {
            status: "CANCELLED",
            cancellationReason: reason,
            cancelledAt: new Date(),
          },
        });

        await tx.auditEvent.create({
          data: {
            actorUserId: user.id,
            action: "DONATION_CANCELLED",
            entityType: "Donation",
            entityId: donation.id,
            reason,
          },
        });
      });

      return NextResponse.json({ success: true, message: "Donation cancelled." });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update donation." },
      { status: 500 }
    );
  }
}

