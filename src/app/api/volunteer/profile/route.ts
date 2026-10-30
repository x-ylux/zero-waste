import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import { volunteerAvailabilitySchema } from "@/lib/validation/capacity";

export async function GET() {
  try {
    const user = await requireAuth();
    const profile = await prisma.volunteerProfile.findUnique({
      where: { userId: user.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    const assignments = await prisma.assignment.findMany({
      where: { volunteerUserId: user.id },
      include: {
        allocation: {
          include: {
            donation: true,
            donationItem: true,
            ngoOrg: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ profile, assignments });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch volunteer profile." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== "VOLUNTEER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const body = await req.json();
    const validated = volunteerAvailabilitySchema.parse(body);

    const updated = await prisma.volunteerProfile.upsert({
      where: { userId: user.id },
      update: {
        isAvailable: validated.isAvailable,
        maxCarryingCapacity: validated.maxCarryingCapacity,
        capacityUnit: validated.capacityUnit,
        operatingRadiusKm: validated.operatingRadiusKm,
        latitude: validated.latitude,
        longitude: validated.longitude,
        vehicleType: validated.vehicleType,
      },
      create: {
        userId: user.id,
        isAvailable: validated.isAvailable,
        maxCarryingCapacity: validated.maxCarryingCapacity,
        capacityUnit: validated.capacityUnit,
        operatingRadiusKm: validated.operatingRadiusKm,
        latitude: validated.latitude,
        longitude: validated.longitude,
        vehicleType: validated.vehicleType,
      },
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error: any) {
    if (error?.errors) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}

