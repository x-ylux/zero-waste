import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AuthServiceError } from "@/lib/auth/service";

export const SESSION_COOKIE_NAME = "rescuerelay.session";

export function authErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthServiceError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Authentication request failed.", error);
  return NextResponse.json(
    { error: "Authentication could not be completed. Check the server configuration and try again." },
    { status: 500 }
  );
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}
