import { z } from "zod";

export const foodCategoryEnum = z.enum([
  "COOKED_MEALS",
  "PACKAGED_FOOD",
  "RAW_PRODUCE",
  "BAKERY",
  "BEVERAGES",
  "DAIRY",
  "OTHER",
]);

export const quantityUnitEnum = z.enum(["SERVINGS", "KG", "PACKETS", "BOXES"]);

export const storageInfoEnum = z.enum(["AMBIENT", "REFRIGERATED", "HOT_HOLD", "FROZEN"]);

export const packagingInfoEnum = z.enum([
  "SEALED_CONTAINERS",
  "FOIL_WRAPPED",
  "BULK_VESSELS",
  "PACKETED",
  "BOXED",
  "OTHER",
]);

export const donationItemSchema = z.object({
  name: z.string().min(2, "Item name must have at least 2 characters").max(100),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than zero"),
  unit: quantityUnitEnum,
  estimatedServings: z
    .number()
    .int("Estimated servings must be an integer")
    .positive("Estimated servings must be positive")
    .optional()
    .nullable(),
});

export const createDonationSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters").max(120),
    foodCategory: foodCategoryEnum,
    dietaryTags: z.array(z.string()).default([]),
    ingredients: z.string().max(1000).optional().nullable(),
    allergens: z
      .array(z.string())
      .min(1, "Please specify allergens or select 'Unknown'"),
    storageInfo: storageInfoEnum,
    packagingInfo: packagingInfoEnum,
    preparationTime: z.string().datetime({ offset: true }).optional().nullable(),
    pickupAddress: z.string().min(5, "Pickup address is required (min 5 characters)"),
    latitude: z
      .number()
      .min(-90)
      .max(90, "Latitude must be between -90 and 90"),
    longitude: z
      .number()
      .min(-180)
      .max(180, "Longitude must be between -180 and 180"),
    pickupWindowStart: z.string().datetime({ offset: true }),
    pickupWindowEnd: z.string().datetime({ offset: true }),
    handlingNotes: z.string().max(1000).optional().nullable(),
    photoUrl: z.string().url("Photo URL must be valid").optional().nullable(),
    item: donationItemSchema,
  })
  .refine(
    (data) => new Date(data.pickupWindowEnd) > new Date(data.pickupWindowStart),
    {
      message: "Collection deadline must be after pickup window start",
      path: ["pickupWindowEnd"],
    }
  )
  .refine(
    (data) => new Date(data.pickupWindowEnd) > new Date(),
    {
      message: "Collection deadline cannot be in the past",
      path: ["pickupWindowEnd"],
    }
  );

export type CreateDonationInput = z.infer<typeof createDonationSchema>;
