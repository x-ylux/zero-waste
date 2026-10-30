import { z } from "zod";
import { quantityUnitEnum } from "./donation";

export const capacityWindowSchema = z
  .object({
    startTime: z.string().datetime({ offset: true }),
    endTime: z.string().datetime({ offset: true }),
    unit: quantityUnitEnum,
    maxCapacity: z
      .number()
      .int("Capacity must be an integer")
      .positive("Capacity must be greater than zero"),
    notes: z.string().max(500).optional().nullable(),
  })
  .refine(
    (data) => new Date(data.endTime) > new Date(data.startTime),
    {
      message: "Window end time must be after start time",
      path: ["endTime"],
    }
  );

export const volunteerAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
  maxCarryingCapacity: z.number().int().positive("Capacity must be positive"),
  capacityUnit: quantityUnitEnum,
  operatingRadiusKm: z.number().positive("Radius must be positive"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  vehicleType: z.string().min(2),
});

export type CapacityWindowInput = z.infer<typeof capacityWindowSchema>;
export type VolunteerAvailabilityInput = z.infer<typeof volunteerAvailabilitySchema>;

