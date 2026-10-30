import { z } from "zod";
import { quantityUnitEnum } from "./donation";

export const splitAllocationSchema = z.object({
  donationId: z.string().uuid("Invalid donation ID"),
  donationItemId: z.string().uuid("Invalid item ID"),
  allocatedQuantity: z
    .number()
    .int("Allocated quantity must be an integer")
    .positive("Allocated quantity must be positive"),
  unit: quantityUnitEnum,
  capacityWindowId: z.string().uuid("Invalid capacity window ID").optional().nullable(),
  notes: z.string().max(500).optional(),
});

export const cancelAllocationSchema = z.object({
  allocationId: z.string().uuid("Invalid allocation ID"),
  reason: z.string().min(5, "A reason of at least 5 characters is mandatory"),
});

export type SplitAllocationInput = z.infer<typeof splitAllocationSchema>;
export type CancelAllocationInput = z.infer<typeof cancelAllocationSchema>;
