import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchDonationAgainstNGOs } from "@/lib/matching/engine";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const donation = await prisma.donation.findUnique({
      where: { id: params.id },
      include: { items: true },
    });

    if (!donation) {
      return NextResponse.json({ error: "Donation not found." }, { status: 404 });
    }

    const item = donation.items[0];
    if (!item) {
      return NextResponse.json({ error: "Donation has no items." }, { status: 400 });
    }

    const remainingQty = item.quantity - item.allocatedQuantity;

    const evaluation = await matchDonationAgainstNGOs({
      id: donation.id,
      donorOrgId: donation.donorOrgId,
      title: donation.title,
      foodCategory: donation.foodCategory,
      quantity: remainingQty,
      unit: item.unit,
      latitude: donation.latitude,
      longitude: donation.longitude,
      pickupWindowStart: donation.pickupWindowStart,
      pickupWindowEnd: donation.pickupWindowEnd,
    });

    return NextResponse.json({ evaluation });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Matching engine evaluation failed." },
      { status: 500 }
    );
  }
}

