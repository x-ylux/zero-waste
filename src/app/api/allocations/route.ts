import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { AllocationService } from "@/lib/allocations/service";
import { splitAllocationSchema } from "@/lib/validation/allocation";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    if (user.role !== "NGO" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only verified NGO representatives or admins can accept allocations." },
        { status: 403 }
      );
    }

    if (!user.organisationId) {
      return NextResponse.json(
        { error: "User is not linked to an NGO organisation." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validated = splitAllocationSchema.parse(body);

    const allocation = await AllocationService.acceptAllocation({
      donationId: validated.donationId,
      donationItemId: validated.donationItemId,
      ngoOrgId: user.organisationId,
      allocatedQuantity: validated.allocatedQuantity,
      unit: validated.unit,
      capacityWindowId: validated.capacityWindowId,
      actorUserId: user.id,
    });

    return NextResponse.json({ success: true, allocation }, { status: 201 });
  } catch (error: any) {
    if (error?.errors) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || "Failed to accept allocation." },
      { status: 400 }
    );
  }
}
