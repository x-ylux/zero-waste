import { z } from "zod";
import { authErrorResponse } from "@/lib/auth/http";
import { registerAccount } from "@/lib/auth/service";
import { NextResponse } from "next/server";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  phone: z.string().trim().min(7).max(30),
  address: z.string().trim().min(3).max(200),
  role: z.enum(["donor", "ngo", "volunteer"]),
  recipientType: z.enum(["community", "animal_shelter"]).optional(),
  organizationName: z.string().trim().min(2).max(120).optional(),
}).superRefine((account, context) => {
  if (account.role !== "volunteer" && !account.organizationName) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["organizationName"],
      message: "Organization name is required for donor and NGO accounts.",
    });
  }
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the registration details." }, { status: 400 });
  }

  try {
    const challenge = await registerAccount(parsed.data);
    return NextResponse.json({
      ...challenge,
      message: "Enter the verification code sent to your email address.",
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
