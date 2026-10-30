import { NextResponse } from "next/server";
import { getSession, setSessionCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { SessionUser } from "@/lib/types/domain";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ user: session });
}

export async function POST(req: Request) {
  // Allow switching users seamlessly in demo mode
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.json({ error: "Demo switch disabled in production." }, { status: 403 });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        memberships: {
          include: { organisation: true },
          take: 1,
        },
        volunteerProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const membership = user.memberships[0];
    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isSuspended: user.isSuspended,
      organisationId: membership?.organisationId || null,
      organisationName: membership?.organisation.name || null,
      organisationType: membership?.organisation.type || null,
      organisationRole: membership?.roleInOrg || null,
      volunteerProfileId: user.volunteerProfile?.id || null,
    };

    await setSessionCookie(sessionUser);
    return NextResponse.json({ success: true, user: sessionUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
