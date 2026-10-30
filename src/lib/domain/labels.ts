import type {
  Allergen,
  DietaryTag,
  DonationStatus,
  FailureReason,
  FoodCategory,
  HandlingRequirement,
  QuantityUnit,
  StorageType,
  TaskStatus,
  TransportType,
} from "@/lib/domain/types";

export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  cooked_meals: "Cooked meals",
  packaged_food: "Packaged food",
  produce: "Produce",
  bakery: "Bakery",
  dairy: "Dairy",
  beverages: "Beverages",
  other: "Other",
};

export const UNIT_LABELS: Record<QuantityUnit, string> = {
  servings: "servings",
  kg: "kg",
  packets: "packets",
  boxes: "boxes",
};

export const DIETARY_LABELS: Record<DietaryTag, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  contains_meat: "Contains meat",
  halal: "Halal",
  jain: "Jain",
};

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: "Gluten",
  dairy: "Dairy",
  nuts: "Nuts",
  soy: "Soy",
  eggs: "Eggs",
  shellfish: "Shellfish",
  sesame: "Sesame",
  unknown: "Unknown",
  none_declared: "None declared",
};

export const STORAGE_LABELS: Record<StorageType, string> = {
  ambient: "Ambient",
  refrigerated: "Refrigerated",
  frozen: "Frozen",
  hot_hold: "Hot hold",
};

export const HANDLING_LABELS: Record<HandlingRequirement, string> = {
  keep_cold: "Keep cold",
  keep_hot: "Keep hot",
  upright: "Keep upright",
  fragile: "Fragile",
  time_sensitive: "Time sensitive",
};

export const DONATION_STATUS_LABELS: Record<DonationStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  collected: "Collected",
  delivered: "Delivered",
  cancelled: "Cancelled",
  expired: "Expired",
  rejected: "Rejected",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  unassigned: "Unassigned",
  assigned: "Assigned",
  picked_up: "Picked up",
  delivered: "Delivered",
  backup_needed: "Backup needed",
  cancelled: "Cancelled",
};

export const FAILURE_LABELS: Record<FailureReason, string> = {
  no_volunteer_available: "No volunteer available",
  recipient_unavailable: "Recipient unavailable",
  packaging_unavailable: "Packaging unavailable",
  handling_mismatch: "Handling mismatch",
  donor_cancellation: "Donor cancellation",
  pickup_window_missed: "Pickup window missed",
  recipient_rejection: "Recipient rejection",
};

export const TRANSPORT_LABELS: Record<TransportType, string> = {
  bike: "Bike",
  scooter: "Scooter",
  car: "Car",
  van: "Van",
  on_foot: "On foot",
};
