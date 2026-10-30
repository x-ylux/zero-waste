import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, setSessionCookie } from "@/lib/auth/session";

const switchPersonaSchema = z.object({
  email: z.string().email().endsWith("@rescueplate.org"),
});

export async function POST(req: Request) {
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.json({ error: "Persona switching is disabled outside demo mode." }, { status: 403 });
  }

  try {
    await requireAuth();
    const body = switchPersonaSchema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: {
        memberships: { include: { organisation: true } },
        volunteerProfile: true,
      },
    });

    if (!user || !user.isActive || user.isSuspended) {
      return NextResponse.json({ error: "Demo persona was not found or is unavailable." }, { status: 404 });
    }

    const membership = user.memberships.find(
      (candidate) =>
        (user.role === "DONOR" && candidate.organisation.type === "DONOR") ||
        (user.role === "NGO" && candidate.organisation.type === "NGO")
    );
    if ((user.role === "DONOR" || user.role === "NGO") && !membership) {
      return NextResponse.json({ error: "Demo persona has no matching organization membership." }, { status: 400 });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isSuspended: user.isSuspended,
      organisationId: membership?.organisationId ?? null,
      organisationName: membership?.organisation.name ?? null,
      organisationType: membership?.organisation.type ?? null,
      organisationRole: membership?.roleInOrg ?? null,
      volunteerProfileId: user.volunteerProfile?.id ?? null,
    };

    await setSessionCookie(sessionUser);
    return NextResponse.json({ success: true, user: sessionUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to switch demo persona." },
      { status: 401 }
    );
  }
}
