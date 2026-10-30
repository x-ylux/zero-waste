import { z } from "zod";

export const generateOtpChallengeSchema = z.object({
  allocationId: z.string().uuid("Invalid allocation ID"),
  stage: z.enum(["COLLECTION", "DELIVERY"]),
});

export const verifyOtpHandoverSchema = z.object({
  allocationId: z.string().uuid("Invalid allocation ID"),
  stage: z.enum(["COLLECTION", "DELIVERY"]),
  otp: z.string().regex(/^\d{6}$/, "Verification code must be exactly 6 digits"),
  verifiedQuantity: z
    .number()
    .int("Verified quantity must be an integer")
    .nonnegative("Verified quantity cannot be negative"),
  rejectedQuantity: z
    .number()
    .int("Rejected quantity must be an integer")
    .nonnegative("Rejected quantity cannot be negative")
    .default(0),
  rejectionReason: z.string().optional().nullable(),
  inspectionNotes: z.string().max(1000).optional().nullable(),
  foodSafetyFlagged: z.boolean().default(false),
  foodSafetyNotes: z.string().max(1000).optional().nullable(),
}).refine(
  (data) => {
    if (data.rejectedQuantity > 0 && (!data.rejectionReason || data.rejectionReason.trim().length < 3)) {
      return false;
    }
    return true;
  },
  {
    message: "A rejection reason is required whenever items are rejected",
    path: ["rejectionReason"],
  }
);

export type GenerateOtpChallengeInput = z.infer<typeof generateOtpChallengeSchema>;
export type VerifyOtpHandoverInput = z.infer<typeof verifyOtpHandoverSchema>;

