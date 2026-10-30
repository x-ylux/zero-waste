import { createId } from "@/lib/domain/ids";
import { haversineKm, simulatedTravelMinutes } from "@/lib/domain/geo";
import { matchDonationToNgos } from "@/lib/domain/matching";
import { assertDonationTransition, assertTaskTransition, isReservable } from "@/lib/domain/transitions";
import type {
  AppNotification,
  AppState,
  Donation,
  EngineOutcome,
  FailureReason,
  HandlingRequirement,
  QuantityUnit,
  RescueTask,
  Role,
  TransportType,
  VolunteerProfile,
} from "@/lib/domain/types";
import { handlingCompatible } from "@/lib/domain/matching";

function cloneState(state: AppState): AppState {
  return structuredClone(state);
}

function ok(state: AppState, message: string): EngineOutcome {
  return { ok: true, state, message };
}

function fail(error: string): EngineOutcome {
  return { ok: false, error };
}

function nowIso(now: Date): string {
  return now.toISOString();
}

function notify(
  state: AppState,
  userId: string,
  title: string,
  message: string,
  now: Date,
  related?: { donationId?: string; taskId?: string }
): void {
  const item: AppNotification = {
    id: createId("ntf"),
    userId,
    title,
    message: `${message} (Simulated notification — not sent over SMS or email.)`,
    channel: "simulated_sms",
    simulated: true,
    read: false,
    createdAt: nowIso(now),
    relatedDonationId: related?.donationId,
    relatedTaskId: related?.taskId,
  };
  state.notifications.unshift(item);
}

function addTimeline(
  state: AppState,
  donationId: string,
  label: string,
  detail: string,
  now: Date,
  extra?: { taskId?: string; actorUserId?: string }
): void {
  state.timeline.unshift({
    id: createId("tl"),
    donationId,
    taskId: extra?.taskId,
    label,
    detail,
    createdAt: nowIso(now),
    actorUserId: extra?.actorUserId,
  });
}

function recordFailure(
  state: AppState,
  reason: FailureReason,
  notes: string,
  now: Date,
  refs?: { donationId?: string; taskId?: string }
): void {
  state.failures.unshift({
    id: createId("fail"),
    reason,
    notes,
    createdAt: nowIso(now),
    donationId: refs?.donationId,
    taskId: refs?.taskId,
  });
}

function userById(state: AppState, userId: string) {
  const user = state.users.find((item) => item.id === userId);
  if (!user) throw new Error("Unknown user.");
  return user;
}

export function expireStaleListings(state: AppState, now: Date = new Date()): AppState {
  const next = cloneState(state);
  for (const donation of next.donations) {
    const windowEnd = new Date(donation.pickupWindowEnd).getTime();
    if (windowEnd > now.getTime()) continue;
    if (donation.status === "available") {
      donation.status = "expired";
      donation.failureReason = "pickup_window_missed";
      donation.updatedAt = nowIso(now);
      recordFailure(next, "pickup_window_missed", `${donation.title} expired before reservation.`, now, {
        donationId: donation.id,
      });
      addTimeline(next, donation.id, "Expired", "Pickup window ended while the listing was still available.", now);
    }
  }
  return next;
}

export interface DonationInput {
  title: string;
  description: string;
  category: Donation["category"];
  quantity: number;
  unit: QuantityUnit;
  estimatedPortions?: number;
  dietaryTags: Donation["dietaryTags"];
  allergens: Donation["allergens"];
  preparedAt?: string;
  storage: Donation["storage"];
  handlingRequirements: HandlingRequirement[];
  packagingAvailable: boolean;
  pickupLocation: Donation["pickupLocation"];
  pickupWindowStart: string;
  pickupWindowEnd: string;
  contactName: string;
  contactPhone: string;
  photoDataUrl?: string;
  handlingAcknowledged: boolean;
}

export function createDonation(state: AppState, userId: string, input: DonationInput, now = new Date()): EngineOutcome {
  try {
    const user = userById(state, userId);
    if (user.role !== "donor" || !user.orgId) return fail("Only a donor organisation can create listings.");
    if (!input.handlingAcknowledged) return fail("Handling-information acknowledgement is required.");
    if (!input.packagingAvailable) {
      const next = cloneState(state);
      recordFailure(next, "packaging_unavailable", "Listing blocked: packaging not available.", now);
      return fail("Packaging is required to list food for volunteer transport in this prototype.");
    }
    if (new Date(input.pickupWindowEnd) <= new Date(input.pickupWindowStart)) {
      return fail("Pickup window end must be after start.");
    }
    const next = cloneState(state);
    const donation: Donation = {
      ...input,
      id: createId("don"),
      donorOrgId: user.orgId,
      createdByUserId: userId,
      status: "available",
      createdAt: nowIso(now),
      updatedAt: nowIso(now),
    };
    next.donations.unshift(donation);
    addTimeline(next, donation.id, "Listed", `${donation.title} is available for matching.`, now, { actorUserId: userId });
    return ok(next, "Donation listed. Matching reasons are visible to NGO coordinators.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not create donation.");
  }
}

export function cancelDonation(
  state: AppState,
  userId: string,
  donationId: string,
  reason: string,
  now = new Date()
): EngineOutcome {
  const next = cloneState(state);
  const donation = next.donations.find((item) => item.id === donationId);
  if (!donation) return fail("Donation not found.");
  const user = userById(next, userId);
  if (user.role !== "donor" && user.role !== "admin") return fail("Only the donor or an administrator can cancel.");
  try {
    assertDonationTransition(donation.status, "cancelled");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid cancellation.");
  }
  donation.status = "cancelled";
  donation.cancellationReason = reason;
  donation.failureReason = "donor_cancellation";
  donation.updatedAt = nowIso(now);
  const task = next.tasks.find((item) => item.donationId === donationId && item.status !== "cancelled" && item.status !== "delivered");
  if (task) {
    try {
      assertTaskTransition(task.status, "cancelled");
      task.status = "cancelled";
      task.cancellationReason = reason;
      task.failureReason = "donor_cancellation";
      task.volunteerId = undefined;
      task.updatedAt = nowIso(now);
    } catch {
      return fail("This listing can no longer be cancelled.");
    }
  }
  recordFailure(next, "donor_cancellation", reason, now, { donationId, taskId: task?.id });
  addTimeline(next, donationId, "Cancelled by donor", reason, now, { actorUserId: userId, taskId: task?.id });
  return ok(next, "Donation cancelled.");
}

export function saveNeeds(
  state: AppState,
  userId: string,
  patch: Partial<AppState["needs"][number]> & { ngoId?: string },
  now = new Date()
): EngineOutcome {
  const user = userById(state, userId);
  if (user.role !== "ngo" || !user.orgId) return fail("Only an NGO coordinator can edit needs.");
  const next = cloneState(state);
  const existing = next.needs.find((item) => item.ngoId === user.orgId);
  if (!existing) return fail("Needs request not found.");
  Object.assign(existing, patch, { ngoId: user.orgId, updatedAt: nowIso(now) });
  const ngo = next.ngos.find((item) => item.id === user.orgId);
  if (ngo) {
    ngo.acceptedCategories = existing.requiredCategories;
    ngo.dietaryRequirements = existing.dietaryRequirements;
    ngo.storageCapabilities = existing.storageCapabilities;
    ngo.handlingCapabilities = existing.handlingCapabilities;
    ngo.receivingHoursStart = existing.receivingHoursStart;
    ngo.receivingHoursEnd = existing.receivingHoursEnd;
    ngo.maxAcceptableQuantity = existing.maxAcceptableQuantity;
    ngo.quantityUnit = existing.quantityUnit;
  }
  return ok(next, "Needs request saved. Matching will use the updated constraints.");
}

export function reserveDonation(
  state: AppState,
  userId: string,
  donationId: string,
  now = new Date()
): EngineOutcome {
  const user = userById(state, userId);
  if (user.role !== "ngo" || !user.orgId) return fail("Only an NGO coordinator can reserve a donation.");
  const next = cloneState(state);
  const donation = next.donations.find((item) => item.id === donationId);
  if (!donation) return fail("Donation not found.");
  if (!isReservable(donation.status)) {
    return fail("An expired or cancelled listing cannot be newly reserved.");
  }
  const ngo = next.ngos.find((item) => item.id === user.orgId);
  if (!ngo) return fail("NGO profile missing.");
  const ranked = matchDonationToNgos(donation, [ngo], next.needs, now)[0];
  if (!ranked?.eligible) {
    return fail(ranked?.hardFailures.join(" ") || "This donation is not eligible for your organisation.");
  }
  try {
    assertDonationTransition(donation.status, "reserved");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid reservation.");
  }
  donation.status = "reserved";
  donation.reservedNgoId = ngo.id;
  donation.updatedAt = nowIso(now);
  const task: RescueTask = {
    id: createId("task"),
    donationId: donation.id,
    ngoId: ngo.id,
    status: "unassigned",
    standbyNotifiedIds: [],
    createdAt: nowIso(now),
    updatedAt: nowIso(now),
  };
  next.tasks.unshift(task);
  addTimeline(next, donation.id, "Reserved", `${ngo.name} reserved this listing and requested volunteer delivery.`, now, {
    actorUserId: userId,
    taskId: task.id,
  });
  next.volunteers
    .filter((vol) => vol.available)
    .forEach((vol) => {
      notify(next, vol.userId, "New pickup requested", `${donation.title} needs a volunteer.`, now, {
        donationId: donation.id,
        taskId: task.id,
      });
    });
  return ok(next, "Donation reserved. Volunteer delivery requested.");
}

export function rejectDonation(
  state: AppState,
  userId: string,
  donationId: string,
  reason: string,
  now = new Date()
): EngineOutcome {
  const user = userById(state, userId);
  if (user.role !== "ngo") return fail("Only an NGO coordinator can reject a reserved donation.");
  const next = cloneState(state);
  const donation = next.donations.find((item) => item.id === donationId);
  if (!donation) return fail("Donation not found.");
  if (donation.reservedNgoId !== user.orgId) return fail("You can only reject a donation reserved for your organisation.");
  try {
    assertDonationTransition(donation.status, "rejected");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Cannot reject this donation.");
  }
  donation.status = "rejected";
  donation.rejectionReason = reason;
  donation.failureReason = "recipient_rejection";
  donation.updatedAt = nowIso(now);
  const task = next.tasks.find((item) => item.donationId === donationId && item.status !== "delivered");
  if (task && task.status !== "cancelled") {
    assertTaskTransition(task.status === "picked_up" ? "picked_up" : task.status, "cancelled");
    task.status = "cancelled";
    task.cancellationReason = reason;
    task.failureReason = "recipient_rejection";
    task.updatedAt = nowIso(now);
  }
  recordFailure(next, "recipient_rejection", reason, now, { donationId, taskId: task?.id });
  addTimeline(next, donationId, "Rejected", reason, now, { actorUserId: userId, taskId: task?.id });
  return ok(next, "Rejection recorded.");
}

export function volunteerCanCarry(vol: VolunteerProfile, donation: Donation): boolean {
  if (vol.capacityUnit !== donation.unit) {
    if (!(vol.capacityUnit === "servings" && donation.unit === "servings")) {
      if (vol.carryingCapacity < donation.quantity && vol.capacityUnit === donation.unit) return false;
      if (vol.capacityUnit !== donation.unit && vol.carryingCapacity < donation.quantity) {
        return vol.transportType === "van" || vol.transportType === "car";
      }
    }
  }
  if (vol.capacityUnit === donation.unit && vol.carryingCapacity < donation.quantity) return false;
  return handlingCompatible(donation.handlingRequirements, vol.handlingCapabilities);
}

function hasActiveAssignment(state: AppState, volunteerId: string): boolean {
  return state.tasks.some(
    (task) => task.volunteerId === volunteerId && (task.status === "assigned" || task.status === "picked_up")
  );
}

function taskHasActiveVolunteer(task: RescueTask): boolean {
  return Boolean(task.volunteerId) && (task.status === "assigned" || task.status === "picked_up");
}

export function listCompatibleTasks(state: AppState, volunteerId: string): RescueTask[] {
  const vol = state.volunteers.find((item) => item.id === volunteerId);
  if (!vol || !vol.available) return [];
  return state.tasks.filter((task) => {
    if (!(task.status === "unassigned" || task.status === "backup_needed")) return false;
    const donation = state.donations.find((item) => item.id === task.donationId);
    if (!donation || donation.status !== "reserved") return false;
    if (task.status === "backup_needed" && !vol.standby) return false;
    return volunteerCanCarry(vol, donation);
  });
}

export function acceptTask(state: AppState, userId: string, taskId: string, now = new Date()): EngineOutcome {
  const user = userById(state, userId);
  if (user.role !== "volunteer" || !user.volunteerId) return fail("Only a volunteer can accept a task.");
  const next = cloneState(state);
  const task = next.tasks.find((item) => item.id === taskId);
  if (!task) return fail("Task not found.");
  if (taskHasActiveVolunteer(task)) return fail("This task already has an active assignment.");
  if (hasActiveAssignment(next, user.volunteerId)) {
    return fail("You already have an active assignment. Complete or cancel it first.");
  }
  const vol = next.volunteers.find((item) => item.id === user.volunteerId);
  const donation = next.donations.find((item) => item.id === task.donationId);
  if (!vol || !donation) return fail("Volunteer or donation missing.");
  if (!volunteerCanCarry(vol, donation)) return fail("This pickup is not compatible with your capacity or handling skills.");
  if (task.status === "backup_needed" && !vol.standby) {
    return fail("Only a standby volunteer can accept a backup-needed task.");
  }
  try {
    assertTaskTransition(task.status, "assigned");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Cannot accept this task.");
  }
  task.status = "assigned";
  task.volunteerId = vol.id;
  task.updatedAt = nowIso(now);
  addTimeline(
    next,
    donation.id,
    task.standbyNotifiedIds.length ? "Backup volunteer accepted" : "Volunteer accepted",
    `${vol.name} is assigned. Only one active volunteer is allowed on this task.`,
    now,
    { actorUserId: userId, taskId: task.id }
  );
  return ok(next, "Task accepted.");
}

export function enterRescueMode(
  state: AppState,
  taskId: string,
  reason: string,
  now: Date,
  actorUserId?: string
): EngineOutcome {
  const next = cloneState(state);
  const task = next.tasks.find((item) => item.id === taskId);
  if (!task) return fail("Task not found.");
  if (task.status !== "assigned") return fail("Rescue Mode starts from an assigned volunteer cancellation.");
  const donation = next.donations.find((item) => item.id === task.donationId);
  if (!donation) return fail("Donation missing.");
  assertTaskTransition(task.status, "backup_needed");
  const previousVolunteerId = task.volunteerId;
  task.status = "backup_needed";
  task.volunteerId = undefined;
  task.cancellationReason = reason;
  task.updatedAt = nowIso(now);
  const standbys = next.volunteers.filter(
    (vol) =>
      vol.standby &&
      vol.available &&
      vol.id !== previousVolunteerId &&
      volunteerCanCarry(vol, donation) &&
      !hasActiveAssignment(next, vol.id)
  );
  task.standbyNotifiedIds = standbys.map((vol) => vol.id);
  standbys.forEach((vol) => {
    notify(
      next,
      vol.userId,
      "Rescue Mode: backup pickup needed",
      `${donation.title} needs a standby volunteer after a cancellation.`,
      now,
      { donationId: donation.id, taskId: task.id }
    );
  });
  if (standbys.length === 0) {
    recordFailure(next, "no_volunteer_available", "No eligible standby volunteer after cancellation.", now, {
      donationId: donation.id,
      taskId: task.id,
    });
  }
  addTimeline(
    next,
    donation.id,
    "Rescue Mode",
    `Assignment released. Task moved to backup needed. ${standbys.length} standby volunteer(s) received a simulated notification.`,
    now,
    { actorUserId, taskId: task.id }
  );
  return ok(next, "Rescue Mode activated. Standby volunteers were notified (simulated).");
}

export function cancelTask(
  state: AppState,
  userId: string,
  taskId: string,
  reason: string,
  now = new Date()
): EngineOutcome {
  const user = userById(state, userId);
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return fail("Task not found.");
  if (user.role === "volunteer") {
    if (task.volunteerId !== user.volunteerId) return fail("You can only cancel your own assignment.");
    return enterRescueMode(state, taskId, reason, now, userId);
  }
  if (user.role !== "admin") return fail("Not allowed.");
  const next = cloneState(state);
  const live = next.tasks.find((item) => item.id === taskId);
  if (!live) return fail("Task not found.");
  assertTaskTransition(live.status, "cancelled");
  live.status = "cancelled";
  live.cancellationReason = reason;
  live.volunteerId = undefined;
  live.updatedAt = nowIso(now);
  addTimeline(next, live.donationId, "Task cancelled", reason, now, { actorUserId: userId, taskId });
  return ok(next, "Task cancelled by administrator.");
}

export function confirmPickup(
  state: AppState,
  userId: string,
  taskId: string,
  method: "qr" | "manual",
  now = new Date()
): EngineOutcome {
  const user = userById(state, userId);
  if (user.role !== "volunteer" || !user.volunteerId) return fail("Only the assigned volunteer can confirm pickup.");
  const next = cloneState(state);
  const task = next.tasks.find((item) => item.id === taskId);
  if (!task) return fail("Task not found.");
  if (task.volunteerId !== user.volunteerId) return fail("This task is assigned to another volunteer.");
  const donation = next.donations.find((item) => item.id === task.donationId);
  if (!donation) return fail("Donation missing.");
  if (donation.status === "delivered") return fail("A delivered donation cannot be picked up again.");
  try {
    assertTaskTransition(task.status, "picked_up");
    assertDonationTransition(donation.status, "collected");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid pickup.");
  }
  task.status = "picked_up";
  task.updatedAt = nowIso(now);
  donation.status = "collected";
  donation.updatedAt = nowIso(now);
  next.handoffs.push({
    id: createId("hand"),
    donationId: donation.id,
    taskId: task.id,
    stage: "pickup",
    actorUserId: userId,
    actorRole: "volunteer",
    quantity: donation.quantity,
    method,
    createdAt: nowIso(now),
    notes: "Pickup confirmation is an operational record, not a food-safety certificate.",
  });
  addTimeline(next, donation.id, "Picked up", `Volunteer confirmed collection via ${method} confirmation.`, now, {
    actorUserId: userId,
    taskId: task.id,
  });
  return ok(next, "Pickup recorded.");
}

export function confirmReceipt(
  state: AppState,
  userId: string,
  donationId: string,
  acceptedQuantity: number,
  now = new Date()
): EngineOutcome {
  const user = userById(state, userId);
  if (user.role !== "ngo" || !user.orgId) return fail("Only the receiving NGO can confirm receipt.");
  const next = cloneState(state);
  const donation = next.donations.find((item) => item.id === donationId);
  if (!donation) return fail("Donation not found.");
  if (donation.reservedNgoId !== user.orgId) return fail("This donation is not assigned to your organisation.");
  if (donation.acceptedQuantity != null && donation.status === "delivered") {
    return fail("Accepted quantity is already recorded. Impact will not double-count.");
  }
  if (acceptedQuantity < 0 || acceptedQuantity > donation.quantity) {
    return fail("Accepted quantity must be between 0 and the listed quantity.");
  }
  const task = next.tasks.find((item) => item.donationId === donationId && item.status === "picked_up");
  if (!task) return fail("Receipt requires a picked-up task.");
  try {
    assertTaskTransition(task.status, "delivered");
    assertDonationTransition(donation.status, "delivered");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid receipt.");
  }
  task.status = "delivered";
  task.updatedAt = nowIso(now);
  donation.status = "delivered";
  donation.acceptedQuantity = acceptedQuantity;
  donation.updatedAt = nowIso(now);
  const ngo = next.ngos.find((item) => item.id === user.orgId);
  if (ngo) ngo.lastCompletedDonationAt = nowIso(now);
  next.handoffs.push({
    id: createId("hand"),
    donationId: donation.id,
    taskId: task.id,
    stage: "receipt",
    actorUserId: userId,
    actorRole: "ngo",
    quantity: acceptedQuantity,
    method: "manual",
    createdAt: nowIso(now),
    notes: "Impact uses this accepted quantity only.",
  });
  addTimeline(
    next,
    donation.id,
    "Receipt confirmed",
    `Accepted ${acceptedQuantity} ${donation.unit}. Impact updated without using listed quantity.`,
    now,
    { actorUserId: userId, taskId: task.id }
  );
  return ok(next, "Delivery confirmed. Impact updated from accepted quantity.");
}

export function updateVolunteerProfile(
  state: AppState,
  userId: string,
  patch: Partial<Pick<VolunteerProfile, "available" | "standby" | "transportType" | "carryingCapacity" | "handlingCapabilities" | "notes" | "location">> & {
    transportType?: TransportType;
  }
): EngineOutcome {
  const user = userById(state, userId);
  if (user.role !== "volunteer" || !user.volunteerId) return fail("Only a volunteer can edit this profile.");
  const next = cloneState(state);
  const vol = next.volunteers.find((item) => item.id === user.volunteerId);
  if (!vol) return fail("Profile missing.");
  Object.assign(vol, patch);
  return ok(next, "Volunteer profile updated.");
}

export function adminReassignTask(
  state: AppState,
  adminUserId: string,
  taskId: string,
  volunteerId: string,
  now = new Date()
): EngineOutcome {
  const admin = userById(state, adminUserId);
  if (admin.role !== "admin") return fail("Administrator role required.");
  const next = cloneState(state);
  const task = next.tasks.find((item) => item.id === taskId);
  if (!task) return fail("Task not found.");
  if (taskHasActiveVolunteer(task) && task.volunteerId !== volunteerId) {
    task.volunteerId = undefined;
  }
  if (hasActiveAssignment(next, volunteerId)) return fail("That volunteer already has an active assignment.");
  const vol = next.volunteers.find((item) => item.id === volunteerId);
  if (!vol) return fail("Volunteer not found.");
  if (task.status === "unassigned" || task.status === "backup_needed") {
    assertTaskTransition(task.status, "assigned");
    task.status = "assigned";
  } else if (task.status !== "assigned") {
    return fail("This task cannot be reassigned in its current status.");
  }
  task.volunteerId = volunteerId;
  task.updatedAt = nowIso(now);
  addTimeline(next, task.donationId, "Admin reassignment", `${vol.name} was assigned by an administrator.`, now, {
    actorUserId: adminUserId,
    taskId: task.id,
  });
  notify(next, vol.userId, "Reassigned pickup", "An administrator assigned you to a rescue task.", now, {
    donationId: task.donationId,
    taskId: task.id,
  });
  return ok(next, `Reassigned to ${vol.name}.`);
}

export function reportIncident(
  state: AppState,
  userId: string,
  title: string,
  description: string,
  donationId?: string,
  taskId?: string,
  now = new Date()
): EngineOutcome {
  const next = cloneState(state);
  userById(next, userId);
  next.incidents.unshift({
    id: createId("inc"),
    donationId,
    taskId,
    reporterUserId: userId,
    title,
    description,
    status: "open",
    createdAt: nowIso(now),
  });
  return ok(next, "Incident recorded.");
}

export interface OnMyWayQuery {
  origin: { lat: number; lng: number; address: string };
  destination: { lat: number; lng: number; address: string };
  departureIso: string;
  maxDetourMinutes: number;
}

export interface OnMyWaySuggestion {
  taskId: string;
  donationId: string;
  title: string;
  extraMinutes: number;
  extraKm: number;
  simulated: true;
  reason: string;
}

export function suggestOnMyWay(
  state: AppState,
  volunteerId: string,
  query: OnMyWayQuery
): OnMyWaySuggestion[] {
  const vol = state.volunteers.find((item) => item.id === volunteerId);
  if (!vol) return [];
  const directKm = haversineKm(query.origin, query.destination);
  const directMin = simulatedTravelMinutes(directKm);
  return listCompatibleTasks(state, volunteerId)
    .map((task) => {
      const donation = state.donations.find((item) => item.id === task.donationId);
      const ngo = state.ngos.find((item) => item.id === task.ngoId);
      if (!donation || !ngo) return null;
      const viaKm =
        haversineKm(query.origin, donation.pickupLocation) +
        haversineKm(donation.pickupLocation, ngo.location) +
        haversineKm(ngo.location, query.destination);
      const viaMin = simulatedTravelMinutes(viaKm);
      const extraMinutes = Math.max(0, viaMin - directMin);
      if (extraMinutes > query.maxDetourMinutes) return null;
      return {
        taskId: task.id,
        donationId: donation.id,
        title: donation.title,
        extraMinutes,
        extraKm: Math.max(0, viaKm - directKm),
        simulated: true as const,
        reason: `Simulated travel-time estimate: about ${extraMinutes} extra minutes versus a direct mock route.`,
      };
    })
    .filter((item): item is OnMyWaySuggestion => Boolean(item))
    .sort((a, b) => a.extraMinutes - b.extraMinutes);
}

export function matchesForDonation(state: AppState, donationId: string, now = new Date()) {
  const donation = state.donations.find((item) => item.id === donationId);
  if (!donation) return [];
  const snapshot = { ...donation, status: "available" as const };
  return matchDonationToNgos(snapshot, state.ngos, state.needs, now);
}

export function actorRole(state: AppState, userId: string): Role {
  return userById(state, userId).role;
}
