export type Role = "donor" | "ngo" | "volunteer" | "admin";
export type NgoRecipientType = "community" | "animal_shelter";

export type DonationStatus =
  | "available"
  | "reserved"
  | "collected"
  | "delivered"
  | "cancelled"
  | "expired"
  | "rejected";

export type TaskStatus =
  | "unassigned"
  | "assigned"
  | "picked_up"
  | "delivered"
  | "backup_needed"
  | "cancelled";

export type FoodCategory =
  | "cooked_meals"
  | "packaged_food"
  | "produce"
  | "bakery"
  | "dairy"
  | "beverages"
  | "other";

export type QuantityUnit = "servings" | "kg" | "packets" | "boxes";

export type DietaryTag =
  | "vegetarian"
  | "vegan"
  | "contains_meat"
  | "halal"
  | "jain";

export type Allergen =
  | "gluten"
  | "dairy"
  | "nuts"
  | "soy"
  | "eggs"
  | "shellfish"
  | "sesame"
  | "unknown"
  | "none_declared";

export type StorageType = "ambient" | "refrigerated" | "frozen" | "hot_hold";

export type HandlingRequirement =
  | "keep_cold"
  | "keep_hot"
  | "upright"
  | "fragile"
  | "time_sensitive";

export type TransportType = "bike" | "scooter" | "car" | "van" | "on_foot";

export type FailureReason =
  | "no_volunteer_available"
  | "recipient_unavailable"
  | "packaging_unavailable"
  | "handling_mismatch"
  | "donor_cancellation"
  | "pickup_window_missed"
  | "recipient_rejection";

export type NotificationChannel = "in_app" | "simulated_sms" | "simulated_email";

export type HandoffStage = "pickup" | "receipt";

export interface GeoPoint {
  lat: number;
  lng: number;
  address: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  orgId?: string;
  volunteerId?: string;
}

export interface DonorOrg {
  id: string;
  name: string;
  kind: "restaurant" | "caterer" | "campus_mess" | "bakery" | "cloud_kitchen";
  contactName: string;
  phone: string;
  location: GeoPoint;
}

export interface NgoProfile {
  id: string;
  name: string;
  recipientType: NgoRecipientType;
  coordinatorName: string;
  phone: string;
  location: GeoPoint;
  acceptedCategories: FoodCategory[];
  dietaryRequirements: DietaryTag[];
  storageCapabilities: StorageType[];
  handlingCapabilities: HandlingRequirement[];
  receivingHoursStart: string;
  receivingHoursEnd: string;
  maxAcceptableQuantity: number;
  quantityUnit: QuantityUnit;
  lastCompletedDonationAt: string | null;
}

export interface NeedsRequest {
  id: string;
  ngoId: string;
  requiredCategories: FoodCategory[];
  requestedQuantity: number;
  quantityUnit: QuantityUnit;
  dietaryRequirements: DietaryTag[];
  receivingHoursStart: string;
  receivingHoursEnd: string;
  storageCapabilities: StorageType[];
  handlingCapabilities: HandlingRequirement[];
  maxAcceptableQuantity: number;
  deliveryAddress: GeoPoint;
  notes?: string;
  updatedAt: string;
}

export interface VolunteerProfile {
  id: string;
  userId: string;
  name: string;
  phone: string;
  location: GeoPoint;
  available: boolean;
  standby: boolean;
  transportType: TransportType;
  carryingCapacity: number;
  capacityUnit: QuantityUnit;
  handlingCapabilities: HandlingRequirement[];
  notes?: string;
}

export interface Donation {
  id: string;
  donorOrgId: string;
  createdByUserId: string;
  title: string;
  description: string;
  category: FoodCategory;
  quantity: number;
  unit: QuantityUnit;
  estimatedPortions?: number;
  dietaryTags: DietaryTag[];
  allergens: Allergen[];
  preparedAt?: string;
  storage: StorageType;
  handlingRequirements: HandlingRequirement[];
  packagingAvailable: boolean;
  animalShelterOnly?: boolean;
  pickupLocation: GeoPoint;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  contactName: string;
  contactPhone: string;
  photoDataUrl?: string;
  handlingAcknowledged: boolean;
  status: DonationStatus;
  reservedNgoId?: string;
  acceptedQuantity?: number;
  rejectionReason?: string;
  cancellationReason?: string;
  failureReason?: FailureReason;
  createdAt: string;
  updatedAt: string;
}

export interface RescueTask {
  id: string;
  donationId: string;
  ngoId: string;
  volunteerId?: string;
  status: TaskStatus;
  standbyNotifiedIds: string[];
  cancellationReason?: string;
  failureReason?: FailureReason;
  createdAt: string;
  updatedAt: string;
}

export interface HandoffEvent {
  id: string;
  donationId: string;
  taskId: string;
  stage: HandoffStage;
  actorUserId: string;
  actorRole: Role;
  quantity?: number;
  notes?: string;
  method: "qr" | "manual" | "system";
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  donationId: string;
  taskId?: string;
  label: string;
  detail: string;
  createdAt: string;
  actorUserId?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  simulated: true;
  read: boolean;
  createdAt: string;
  relatedDonationId?: string;
  relatedTaskId?: string;
}

export interface IncidentReport {
  id: string;
  donationId?: string;
  taskId?: string;
  reporterUserId: string;
  title: string;
  description: string;
  status: "open" | "reviewing" | "resolved";
  createdAt: string;
}

export interface FailureRecord {
  id: string;
  donationId?: string;
  taskId?: string;
  reason: FailureReason;
  notes: string;
  createdAt: string;
}

export interface AppState {
  version: string;
  generatedAt: string;
  users: User[];
  donors: DonorOrg[];
  ngos: NgoProfile[];
  needs: NeedsRequest[];
  volunteers: VolunteerProfile[];
  donations: Donation[];
  tasks: RescueTask[];
  handoffs: HandoffEvent[];
  timeline: TimelineEvent[];
  notifications: AppNotification[];
  incidents: IncidentReport[];
  failures: FailureRecord[];
}

export interface MatchScoreBreakdown {
  distance: number;
  unmetDemand: number;
  recency: number;
  categoryRelevance: number;
  total: number;
}

export interface MatchCandidate {
  ngoId: string;
  ngoName: string;
  eligible: boolean;
  hardFailures: string[];
  score: MatchScoreBreakdown | null;
  distanceKm: number;
  unmetQuantity: number;
  hoursSinceLastCompleted: number | null;
  reason: string;
}

export interface EngineResult<T = AppState> {
  ok: true;
  state: T;
  message: string;
}

export interface EngineError {
  ok: false;
  error: string;
}

export type EngineOutcome<T = AppState> = EngineResult<T> | EngineError;

export const ACTIVE_DONATION_STATUSES: DonationStatus[] = ["available", "reserved", "collected"];
export const TERMINAL_DONATION_STATUSES: DonationStatus[] = [
  "delivered",
  "cancelled",
  "expired",
  "rejected",
];
export const ACTIVE_TASK_ASSIGNMENT_STATUSES: TaskStatus[] = ["assigned", "picked_up"];
