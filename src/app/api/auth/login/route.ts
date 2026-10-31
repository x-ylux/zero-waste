import { z } from "zod";
import { authErrorResponse } from "@/lib/auth/http";
import { startLogin } from "@/lib/auth/service";
import { NextResponse } from "next/server";

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address and password." }, { status: 400 });
  }

  try {
    const challenge = await startLogin(parsed.data.email, parsed.data.password);
    return NextResponse.json({
      ...challenge,
      message: "Enter the verification code sent to your email address.",
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
