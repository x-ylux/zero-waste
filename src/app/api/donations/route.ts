import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import { createDonationSchema } from "@/lib/validation/donation";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const donorOrgId = searchParams.get("donorOrgId");
    const category = searchParams.get("category");
    const active = searchParams.get("active") === "true";

    const donations = await prisma.donation.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(donorOrgId ? { donorOrgId } : {}),
        ...(category ? { foodCategory: category as any } : {}),
        ...(active
          ? {
              status: { in: ["OPEN", "PARTIALLY_ALLOCATED"] as const },
              pickupWindowEnd: { gt: new Date() },
            }
          : {}),
      },
      include: {
        donorOrg: true,
        items: true,
        allocations: {
          include: {
            ngoOrg: true,
            assignments: {
              where: { isCurrent: true },
              include: { volunteer: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ donations });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch donations." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    if (user.role !== "DONOR" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only food donors or admins can create donations." },
        { status: 403 }
      );
    }

    if (!user.organisationId) {
      return NextResponse.json(
        { error: "User is not linked to any donor organisation." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validated = createDonationSchema.parse(body);

    const donation = await prisma.$transaction(async (tx) => {
      const created = await tx.donation.create({
        data: {
          donorOrgId: user.organisationId!,
          createdByUserId: user.id,
          title: validated.title,
          foodCategory: validated.foodCategory,
          dietaryTags: JSON.stringify(validated.dietaryTags),
          ingredients: validated.ingredients || null,
          allergens: JSON.stringify(validated.allergens),
          storageInfo: validated.storageInfo,
          packagingInfo: validated.packagingInfo,
          preparationTime: validated.preparationTime
            ? new Date(validated.preparationTime)
            : null,
          pickupAddress: validated.pickupAddress,
          latitude: validated.latitude,
          longitude: validated.longitude,
          pickupWindowStart: new Date(validated.pickupWindowStart),
          pickupWindowEnd: new Date(validated.pickupWindowEnd),
          handlingNotes: validated.handlingNotes || null,
          photoUrl: validated.photoUrl || null,
          status: "OPEN",
          items: {
            create: {
              name: validated.item.name,
              quantity: validated.item.quantity,
              unit: validated.item.unit,
              estimatedServings: validated.item.estimatedServings || null,
            },
          },
        },
        include: {
          items: true,
          donorOrg: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId: user.id,
          action: "DONATION_PUBLISHED",
          entityType: "Donation",
          entityId: created.id,
          details: JSON.stringify({
            title: created.title,
            quantity: validated.item.quantity,
            unit: validated.item.unit,
          }),
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, donation }, { status: 201 });
  } catch (error: any) {
    if (error?.errors) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || "Failed to create donation." },
      { status: 500 }
    );
  }
}
