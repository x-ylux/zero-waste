import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireRole(["ADMIN"]);
    const incidents = await prisma.incident.findMany({
      include: {
        allocation: {
          include: {
            donation: true,
            ngoOrg: true,
          },
        },
        reporter: { select: { id: true, name: true, email: true } },
        resolver: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ incidents });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch incidents." },
      { status: 403 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireRole(["ADMIN"]);
    const body = await req.json();
    const { incidentId, status, resolutionNotes } = body;

    if (!["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const updated = await prisma.incident.update({
      where: { id: incidentId },
      data: {
        status,
        resolutionNotes: resolutionNotes || null,
        resolvedByUserId: status === "RESOLVED" || status === "DISMISSED" ? admin.id : null,
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorUserId: admin.id,
        action: `INCIDENT_${status}`,
        entityType: "Incident",
        entityId: updated.id,
        reason: resolutionNotes || `Admin updated incident to ${status}`,
      },
    });

    return NextResponse.json({ success: true, incident: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update incident." },
      { status: 500 }
    );
  }
}

