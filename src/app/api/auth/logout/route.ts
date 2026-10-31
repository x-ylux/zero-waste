import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authErrorResponse, clearSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/http";
import { revokeSession } from "@/lib/auth/service";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) await revokeSession(token);
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
