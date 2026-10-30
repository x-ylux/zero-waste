import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import { capacityWindowSchema } from "@/lib/validation/capacity";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user.organisationId) {
      return NextResponse.json({ error: "No organization linked." }, { status: 400 });
    }

    const windows = await prisma.capacityWindow.findMany({
      where: { organisationId: user.organisationId },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({ windows });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch capacity windows." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== "NGO" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
    if (!user.organisationId) {
      return NextResponse.json({ error: "No organization linked." }, { status: 400 });
    }

    const body = await req.json();
    const validated = capacityWindowSchema.parse(body);

    const window = await prisma.capacityWindow.create({
      data: {
        organisationId: user.organisationId,
        startTime: new Date(validated.startTime),
        endTime: new Date(validated.endTime),
        unit: validated.unit,
        maxCapacity: validated.maxCapacity,
        notes: validated.notes || null,
      },
    });

    return NextResponse.json({ success: true, window }, { status: 201 });
  } catch (error: any) {
    if (error?.errors) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || "Failed to create capacity window." },
      { status: 500 }
    );
  }
}
