import { z } from "zod";

const geoSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(4),
});

export const donationFormSchema = z
  .object({
    title: z.string().min(3, "Add a food title."),
    description: z.string().min(8, "Describe the food."),
    category: z.enum(["cooked_meals", "packaged_food", "produce", "bakery", "dairy", "beverages", "other"]),
    quantity: z.number().positive("Quantity must be greater than zero."),
    unit: z.enum(["servings", "kg", "packets", "boxes"]),
    estimatedPortions: z.number().positive().optional(),
    dietaryTags: z.array(z.enum(["vegetarian", "vegan", "contains_meat", "halal", "jain"])).min(1),
    allergens: z.array(z.enum(["gluten", "dairy", "nuts", "soy", "eggs", "shellfish", "sesame", "unknown", "none_declared"])).min(1),
    preparedAt: z.string().optional(),
    storage: z.enum(["ambient", "refrigerated", "frozen", "hot_hold"]),
    handlingRequirements: z.array(z.enum(["keep_cold", "keep_hot", "upright", "fragile", "time_sensitive"])),
    packagingAvailable: z.boolean(),
    pickupLocation: geoSchema,
    pickupWindowStart: z.string().min(1),
    pickupWindowEnd: z.string().min(1),
    contactName: z.string().min(2),
    contactPhone: z.string().min(8),
    photoDataUrl: z.string().optional(),
    handlingAcknowledged: z.literal(true, {
      errorMap: () => ({ message: "Confirm that handling and allergen details are donor-declared." }),
    }),
  })
  .refine((value) => new Date(value.pickupWindowEnd) > new Date(value.pickupWindowStart), {
    message: "Pickup window must end after it starts.",
    path: ["pickupWindowEnd"],
  });

export const needsFormSchema = z.object({
  requiredCategories: z.array(z.string()).min(1),
  requestedQuantity: z.number().positive(),
  quantityUnit: z.enum(["servings", "kg", "packets", "boxes"]),
  dietaryRequirements: z.array(z.enum(["vegetarian", "vegan", "contains_meat", "halal", "jain"])),
  receivingHoursStart: z.string().regex(/^\d{2}:\d{2}$/),
  receivingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/),
  storageCapabilities: z.array(z.enum(["ambient", "refrigerated", "frozen", "hot_hold"])).min(1),
  handlingCapabilities: z.array(z.enum(["keep_cold", "keep_hot", "upright", "fragile", "time_sensitive"])),
  maxAcceptableQuantity: z.number().positive(),
  deliveryAddress: geoSchema,
  notes: z.string().optional(),
});

export type DonationFormValues = z.infer<typeof donationFormSchema>;
