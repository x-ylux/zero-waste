import { z } from "zod";
import { authErrorResponse, setSessionCookie } from "@/lib/auth/http";
import { verifyEmailCode } from "@/lib/auth/service";
import { NextResponse } from "next/server";

const verifySchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the six-digit verification code from your email." }, { status: 400 });
  }

  try {
    const session = await verifyEmailCode(parsed.data.challengeId, parsed.data.code);
    await setSessionCookie(session.token, session.expiresAt);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
