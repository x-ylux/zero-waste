import { randomUUID } from "node:crypto";
import type {
  DonorOrg,
  GeoPoint,
  NeedsRequest,
  NgoProfile,
  QuantityUnit,
  User,
  VolunteerProfile,
} from "@/lib/domain/types";
import type { AuthenticatedAccount } from "@/lib/auth/types";
import {
  createEmailCode,
  createSessionToken,
  hashEmailCode,
  hashPassword,
  hashSessionToken,
  verifyEmailCodeHash,
  verifyPassword,
} from "@/lib/auth/security";

const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_RESEND_WAIT_MS = 60 * 1000;
const MAX_CODES_PER_HOUR = 8;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BENGALURU_LOCATION: GeoPoint = {
  lat: 12.9716,
  lng: 77.5946,
  address: "Bengaluru",
};

export type AccountRole = "donor" | "ngo" | "volunteer";
export type EmailCodePurpose = "verify" | "login";

export class AuthServiceError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

export interface RegisterAccountInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  role: AccountRole;
  organizationName?: string;
}

function authEnvironmentConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL &&
      process.env.RESEND_API_KEY &&
      process.env.RESEND_FROM_EMAIL &&
      process.env.AUTH_SECRET &&
      process.env.AUTH_SECRET.length >= 32
  );
}

export function isAuthConfigured(): boolean {
  return authEnvironmentConfigured();
}

async function getPrisma() {
  if (!process.env.DATABASE_URL) {
    throw new AuthServiceError("Account login requires DATABASE_URL. Configure the database and apply migrations.", 503);
  }
  const { prisma } = await import("@/lib/db/prisma");
  return prisma;
}

function getEmailConfiguration(): { apiKey: string; from: string; secret: string } {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    throw new AuthServiceError("Email verification is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.", 503);
  }
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    throw new AuthServiceError("Secure account sessions are not configured. Set AUTH_SECRET to a random value of at least 32 characters.", 503);
  }
  return {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM_EMAIL,
    secret: process.env.AUTH_SECRET,
  };
}

async function sendEmailCode(email: string, code: string): Promise<void> {
  const { apiKey, from } = getEmailConfiguration();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your RescueRelay verification code",
      text: `Your RescueRelay verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    }),
  });

  if (!response.ok) {
    throw new AuthServiceError(
      `The email provider could not deliver your verification code (HTTP ${response.status}). Check the Resend sender configuration and try again.`,
      502
    );
  }
}

async function issueEmailCode(userId: string, email: string, purpose: EmailCodePurpose) {
  const prisma = await getPrisma();
  const { secret } = getEmailConfiguration();
  const now = new Date();
  const recent = await prisma.emailCodeChallenge.count({
    where: { userId, createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } },
  });

  if (recent >= MAX_CODES_PER_HOUR) {
    throw new AuthServiceError("Too many verification codes were requested. Try again in an hour.", 429);
  }
  const recentMinute = await prisma.emailCodeChallenge.count({
    where: { userId, createdAt: { gte: new Date(now.getTime() - CODE_RESEND_WAIT_MS) } },
  });
  if (recentMinute > 0) {
    throw new AuthServiceError("A verification code was sent recently. Check your email or wait one minute before trying again.", 429);
  }

  const challengeId = randomUUID();
  const code = createEmailCode();
  await prisma.emailCodeChallenge.create({
    data: {
      id: challengeId,
      userId,
      purpose,
      codeHash: hashEmailCode(challengeId, code, secret),
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    },
  });

  try {
    await sendEmailCode(email, code);
  } catch (error) {
    await prisma.emailCodeChallenge.delete({ where: { id: challengeId } });
    throw error;
  }

  return { challengeId, purpose };
}

export async function registerAccount(input: RegisterAccountInput) {
  getEmailConfiguration();
  const prisma = await getPrisma();
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  const userId = `user-${randomUUID()}`;
  const orgId = input.role === "volunteer" ? undefined : `org-${randomUUID()}`;
  const volunteerId = input.role === "volunteer" ? `vol-${randomUUID()}` : undefined;

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.user.create({
        data: {
          id: userId,
          name: input.name.trim(),
          email,
          role: input.role,
          phone: input.phone.trim(),
          orgId,
          volunteerId,
        },
      });

      await transaction.userCredential.create({
        data: { userId, passwordHash },
      });

      if (input.role === "donor" && orgId) {
        await transaction.donorOrg.create({
          data: {
            id: orgId,
            name: input.organizationName!.trim(),
            kind: "restaurant",
            contactName: input.name.trim(),
            phone: input.phone.trim(),
            address: input.address.trim(),
            latitude: BENGALURU_LOCATION.lat,
            longitude: BENGALURU_LOCATION.lng,
          },
        });
      } else if (input.role === "ngo" && orgId) {
        const categories = ["cooked_meals", "bakery", "produce"];
        const dietary = ["vegetarian"];
        const storage = ["refrigerated", "ambient"];
        const handling = ["keep_cold", "upright", "time_sensitive"];
        await transaction.ngoProfile.create({
          data: {
            id: orgId,
            name: input.organizationName!.trim(),
            coordinatorName: input.name.trim(),
            phone: input.phone.trim(),
            address: input.address.trim(),
            latitude: BENGALURU_LOCATION.lat,
            longitude: BENGALURU_LOCATION.lng,
            acceptedCategories: JSON.stringify(categories),
            dietaryRequirements: JSON.stringify(dietary),
            storageCapabilities: JSON.stringify(storage),
            handlingCapabilities: JSON.stringify(handling),
            receivingHoursStart: "08:00",
            receivingHoursEnd: "22:00",
            maxAcceptableQuantity: 100,
            quantityUnit: "servings",
          },
        });
        await transaction.needsRequest.create({
          data: {
            id: `needs-${orgId}`,
            ngoId: orgId,
            requiredCategories: JSON.stringify(categories),
            requestedQuantity: 100,
            quantityUnit: "servings",
            dietaryRequirements: JSON.stringify(dietary),
            receivingHoursStart: "08:00",
            receivingHoursEnd: "22:00",
            storageCapabilities: JSON.stringify(storage),
            handlingCapabilities: JSON.stringify(handling),
            maxAcceptableQuantity: 100,
            deliveryAddress: input.address.trim(),
            deliveryLat: BENGALURU_LOCATION.lat,
            deliveryLng: BENGALURU_LOCATION.lng,
            updatedAt: new Date(),
          },
        });
      } else if (input.role === "volunteer" && volunteerId) {
        await transaction.volunteerProfile.create({
          data: {
            id: volunteerId,
            userId,
            name: input.name.trim(),
            phone: input.phone.trim(),
            address: input.address.trim(),
            latitude: BENGALURU_LOCATION.lat,
            longitude: BENGALURU_LOCATION.lng,
            available: true,
            standby: false,
            transportType: "scooter",
            carryingCapacity: 30,
            capacityUnit: "servings",
            handlingCapabilities: JSON.stringify(["keep_cold", "keep_hot", "upright", "time_sensitive"]),
          },
        });
      }
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new AuthServiceError("An account with this email already exists. Try signing in instead.", 409);
    }
    throw error;
  }

  return issueEmailCode(userId, email, "verify");
}

export async function startLogin(emailInput: string, password: string) {
  getEmailConfiguration();
  const prisma = await getPrisma();
  const email = emailInput.trim().toLowerCase();
  const account = await prisma.user.findUnique({
    where: { email },
    include: { credential: true },
  });

  if (!account?.credential || !(await verifyPassword(password, account.credential.passwordHash))) {
    throw new AuthServiceError("Email or password is incorrect.", 401);
  }

  return issueEmailCode(
    account.id,
    account.email,
    account.credential.emailVerified ? "login" : "verify"
  );
}

export async function verifyEmailCode(challengeId: string, code: string) {
  const prisma = await getPrisma();
  const { secret } = getEmailConfiguration();
  const challenge = await prisma.emailCodeChallenge.findUnique({
    where: { id: challengeId },
    include: { user: { include: { credential: true } } },
  });
  const now = new Date();

  if (
    !challenge ||
    challenge.consumedAt ||
    challenge.expiresAt <= now ||
    challenge.attempts >= 5 ||
    !challenge.user.credential
  ) {
    throw new AuthServiceError("That verification code has expired or is no longer valid. Sign in again to request a new code.", 400);
  }

  if (!verifyEmailCodeHash(challenge.id, code, secret, challenge.codeHash)) {
    await prisma.emailCodeChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, attempts: { lt: 5 } },
      data: { attempts: { increment: 1 } },
    });
    throw new AuthServiceError("The verification code is incorrect.", 400);
  }

  const token = createSessionToken();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await prisma.$transaction(async (transaction) => {
    const consumed = await transaction.emailCodeChallenge.updateMany({
      where: {
        id: challenge.id,
        consumedAt: null,
        attempts: { lt: 5 },
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) {
      throw new AuthServiceError("That verification code has expired or is no longer valid. Sign in again to request a new code.", 400);
    }
    if (challenge.purpose === "verify") {
      await transaction.userCredential.update({
        where: { userId: challenge.userId },
        data: { emailVerified: true },
      });
    }
    await transaction.authSession.create({
      data: {
        id: randomUUID(),
        tokenHash: hashSessionToken(token),
        userId: challenge.userId,
        expiresAt,
      },
    });
  });

  return { token, expiresAt };
}

function parseStringArray(value: string): string[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new Error("Stored account profile contains invalid capability data.");
  }
  return parsed;
}

export async function getAuthenticatedAccount(token: string): Promise<AuthenticatedAccount | null> {
  const prisma = await getPrisma();
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: { include: { credential: true } } },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date() || !session.user.credential?.emailVerified) {
    await prisma.authSession.delete({ where: { id: session.id } });
    return null;
  }

  const user: User = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    phone: session.user.phone ?? undefined,
    orgId: session.user.orgId ?? undefined,
    volunteerId: session.user.volunteerId ?? undefined,
  };

  if (user.role === "donor" && user.orgId) {
    const profile = await prisma.donorOrg.findUnique({ where: { id: user.orgId } });
    if (!profile) throw new Error("Donor account is missing its organization profile.");
    const donor: DonorOrg = {
      id: profile.id,
      name: profile.name,
      kind: "restaurant",
      contactName: profile.contactName,
      phone: profile.phone,
      location: { lat: profile.latitude, lng: profile.longitude, address: profile.address },
    };
    return { user, donor };
  }

  if (user.role === "ngo" && user.orgId) {
    const profile = await prisma.ngoProfile.findUnique({ where: { id: user.orgId } });
    const needsRecord = await prisma.needsRequest.findUnique({ where: { ngoId: user.orgId } });
    if (!profile || !needsRecord) throw new Error("NGO account is missing its profile or needs request.");
    const ngo: NgoProfile = {
      id: profile.id,
      name: profile.name,
      coordinatorName: profile.coordinatorName,
      phone: profile.phone,
      location: { lat: profile.latitude, lng: profile.longitude, address: profile.address },
      acceptedCategories: parseStringArray(profile.acceptedCategories) as NgoProfile["acceptedCategories"],
      dietaryRequirements: parseStringArray(profile.dietaryRequirements) as NgoProfile["dietaryRequirements"],
      storageCapabilities: parseStringArray(profile.storageCapabilities) as NgoProfile["storageCapabilities"],
      handlingCapabilities: parseStringArray(profile.handlingCapabilities) as NgoProfile["handlingCapabilities"],
      receivingHoursStart: profile.receivingHoursStart,
      receivingHoursEnd: profile.receivingHoursEnd,
      maxAcceptableQuantity: profile.maxAcceptableQuantity,
      quantityUnit: profile.quantityUnit,
      lastCompletedDonationAt: profile.lastCompletedDonationAt?.toISOString() ?? null,
    };
    const needs: NeedsRequest = {
      id: needsRecord.id,
      ngoId: needsRecord.ngoId,
      requiredCategories: parseStringArray(needsRecord.requiredCategories) as NeedsRequest["requiredCategories"],
      requestedQuantity: needsRecord.requestedQuantity,
      quantityUnit: needsRecord.quantityUnit,
      dietaryRequirements: parseStringArray(needsRecord.dietaryRequirements) as NeedsRequest["dietaryRequirements"],
      receivingHoursStart: needsRecord.receivingHoursStart,
      receivingHoursEnd: needsRecord.receivingHoursEnd,
      storageCapabilities: parseStringArray(needsRecord.storageCapabilities) as NeedsRequest["storageCapabilities"],
      handlingCapabilities: parseStringArray(needsRecord.handlingCapabilities) as NeedsRequest["handlingCapabilities"],
      maxAcceptableQuantity: needsRecord.maxAcceptableQuantity,
      deliveryAddress: {
        lat: needsRecord.deliveryLat,
        lng: needsRecord.deliveryLng,
        address: needsRecord.deliveryAddress,
      },
      notes: needsRecord.notes ?? undefined,
      updatedAt: needsRecord.updatedAt.toISOString(),
    };
    return { user, ngo, needs };
  }

  if (user.role === "volunteer" && user.volunteerId) {
    const profile = await prisma.volunteerProfile.findUnique({ where: { id: user.volunteerId } });
    if (!profile) throw new Error("Volunteer account is missing its volunteer profile.");
    const volunteer: VolunteerProfile = {
      id: profile.id,
      userId: profile.userId,
      name: profile.name,
      phone: profile.phone,
      location: { lat: profile.latitude, lng: profile.longitude, address: profile.address },
      available: profile.available,
      standby: profile.standby,
      transportType: "scooter",
      carryingCapacity: profile.carryingCapacity,
      capacityUnit: profile.capacityUnit as QuantityUnit,
      handlingCapabilities: parseStringArray(profile.handlingCapabilities) as VolunteerProfile["handlingCapabilities"],
      notes: profile.notes ?? undefined,
    };
    return { user, volunteer };
  }

  throw new Error("This account does not have a supported self-registration role.");
}

export async function revokeSession(token: string): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const prisma = await getPrisma();
  await prisma.authSession.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}
