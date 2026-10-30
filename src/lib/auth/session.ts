import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { SessionUser, UserRole } from "@/lib/types/domain";

const SESSION_COOKIE_NAME = "rescueplate_session";
const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || "rescueplate-fallback-secret-development-key-32chars"
);

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return (payload.user as SessionUser) || null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  if (user.isSuspended) {
    throw new Error("ACCOUNT_SUSPENDED");
  }
  return user;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN_ROLE");
  }
  return user;
}

export async function requireOrgAccess(
  orgId: string,
  allowedRoles?: UserRole[]
): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role === "ADMIN") {
    return user;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN_ROLE");
  }
  if (user.organisationId !== orgId) {
    throw new Error("CROSS_ORGANISATION_ACCESS_DENIED");
  }
  return user;
}

