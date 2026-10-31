import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthenticatedAccount, isAuthConfigured } from "@/lib/auth/service";
import { authErrorResponse, SESSION_COOKIE_NAME } from "@/lib/auth/http";

export async function GET() {
  if (!isAuthConfigured()) {
    return NextResponse.json({ configured: false, account: null });
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ configured: true, account: null });

    const account = await getAuthenticatedAccount(token);
    return NextResponse.json({ configured: true, account });
  } catch (error) {
    return authErrorResponse(error);
  }
}
