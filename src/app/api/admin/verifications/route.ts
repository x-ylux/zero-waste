import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireRole(["ADMIN"]);
    const verifications = await prisma.organisationVerification.findMany({
      include: {
        organisation: true,
        reviewer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ verifications });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch verifications." },
      { status: 403 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireRole(["ADMIN"]);
    const body = await req.json();
    const { verificationId, status, reviewNotes } = body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ver = await tx.organisationVerification.update({
        where: { id: verificationId },
        data: {
          verificationStatus: status,
          reviewNotes: reviewNotes || null,
          reviewedByUserId: admin.id,
          reviewedAt: new Date(),
        },
        include: { organisation: true },
      });

      if (status === "APPROVED") {
        await tx.organisation.update({
          where: { id: ver.organisationId },
          data: { isVerified: true },
        });
      }

      await tx.auditEvent.create({
        data: {
          actorUserId: admin.id,
          action: `ORGANISATION_VERIFICATION_${status}`,
          entityType: "OrganisationVerification",
          entityId: ver.id,
          reason: reviewNotes || `Admin reviewed verification as ${status}`,
        },
      });

      return ver;
    });

    return NextResponse.json({ success: true, verification: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Verification review failed." },
      { status: 500 }
    );
  }
}
