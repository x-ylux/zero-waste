import {
  AllocationStatus,
  AssignmentStatus,
  DonationStatus,
  FoodCategory,
  OrgType,
  PackagingInfo,
  QuantityUnit,
  Role,
  StorageInfo,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const DEMO_PASSWORD = "Password123!";

const donors = [
  {
    key: "campus",
    id: "org-donor-apex-campus",
    name: "Apex University Student Mess",
    description: "Campus mess hall serving lunch and dinner to students every day.",
    address: "80 Feet Road, Koramangala, Bengaluru, Karnataka 560034",
    latitude: 12.9345,
    longitude: 77.6265,
    email: "donor.mess@rescueplate.org",
    contact: "Suresh Patil",
  },
  {
    key: "caterer",
    id: "org-donor-grand-pavilion",
    name: "Grand Pavilion Banquets & Catering",
    description: "Event caterer with prepared meals and individually packed portions.",
    address: "100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038",
    latitude: 12.9719,
    longitude: 77.6412,
    email: "donor.caterer@rescueplate.org",
    contact: "Vikram Singhania",
  },
  {
    key: "bakery",
    id: "org-donor-greenharvest",
    name: "GreenHarvest Farm Kitchen",
    description: "Restaurant and bakery with fresh bread, salads, and daily specials.",
    address: "MG Road, Ashok Nagar, Bengaluru, Karnataka 560001",
    latitude: 12.9756,
    longitude: 77.6066,
    email: "donor.bistro@rescueplate.org",
    contact: "Ananya Deshmukh",
  },
  {
    key: "restaurant",
    id: "org-donor-namma-table",
    name: "Namma Table Restaurant",
    description: "Neighborhood restaurant preparing South Indian vegetarian meals.",
    address: "Jayanagar 4th Block, Bengaluru, Karnataka 560011",
    latitude: 12.925,
    longitude: 77.5838,
    email: "donor.restaurant@rescueplate.org",
    contact: "Riya Menon",
  },
  {
    key: "commissary",
    id: "org-donor-lakeview-commissary",
    name: "Lakeview Community Commissary",
    description: "Institutional kitchen packaging safe surplus for community partners.",
    address: "BTM Layout, Bengaluru, Karnataka 560076",
    latitude: 12.9166,
    longitude: 77.6101,
    email: "donor.commissary@rescueplate.org",
    contact: "Ramesh Iyer",
  },
] as const;

const ngos = [
  {
    key: "annapurna",
    id: "org-ngo-annapurna",
    name: "Annapurna Seva Kendra",
    description: "Community dining shelter receiving cooked meals, bakery items, and packaged food.",
    address: "Ejipura Main Road, Bengaluru, Karnataka 560047",
    latitude: 12.9392,
    longitude: 77.6258,
    operatingHoursStart: "00:00",
    operatingHoursEnd: "23:59",
    collectionRadiusKm: 12,
    acceptedCategories: ["COOKED_MEALS", "BAKERY", "PACKAGED_FOOD"],
    email: "ngo.annapurna@rescueplate.org",
    contact: "Sister Teresa Mary",
  },
  {
    key: "hungerrelief",
    id: "org-ngo-hunger-relief",
    name: "Bengaluru Hunger Relief Mission",
    description: "Community kitchens receiving meals, produce, and sealed grocery packs.",
    address: "14th Main Road, HSR Layout, Bengaluru, Karnataka 560102",
    latitude: 12.9121,
    longitude: 77.6446,
    operatingHoursStart: "06:00",
    operatingHoursEnd: "23:59",
    collectionRadiusKm: 15,
    acceptedCategories: ["COOKED_MEALS", "RAW_PRODUCE", "PACKAGED_FOOD"],
    email: "ngo.hungerrelief@rescueplate.org",
    contact: "Devendra Hegde",
  },
  {
    key: "sneha",
    id: "org-ngo-sneha",
    name: "Sneha Children Shelter Foundation",
    description: "Residential child-care shelter receiving meals, dairy, bakery, and produce.",
    address: "Domlur 2nd Stage, Bengaluru, Karnataka 560071",
    latitude: 12.9609,
    longitude: 77.6387,
    operatingHoursStart: "06:00",
    operatingHoursEnd: "22:00",
    collectionRadiusKm: 10,
    acceptedCategories: ["COOKED_MEALS", "DAIRY", "BAKERY", "RAW_PRODUCE"],
    email: "ngo.sneha@rescueplate.org",
    contact: "Kavita Rao",
  },
  {
    key: "sahaara",
    id: "org-ngo-sahaara",
    name: "Sahaara Fresh Pantry",
    description: "Fresh-food pantry with cold storage and limited daily receiving windows.",
    address: "Jayanagar 3rd Block, Bengaluru, Karnataka 560011",
    latitude: 12.929,
    longitude: 77.583,
    operatingHoursStart: "06:00",
    operatingHoursEnd: "19:00",
    collectionRadiusKm: 7,
    acceptedCategories: ["RAW_PRODUCE", "PACKAGED_FOOD", "DAIRY"],
    email: "ngo.sahaara@rescueplate.org",
    contact: "Farah Khan",
  },
] as const;

const volunteers = [
  { key: "aarav", email: "vol.aarav@rescueplate.org", name: "Aarav Sharma", capacity: 70, unit: QuantityUnit.SERVINGS, radius: 12, latitude: 12.935, longitude: 77.625, vehicle: "TWO_WHEELER", available: true },
  { key: "priya", email: "vol.priya@rescueplate.org", name: "Priya Venkatesh", capacity: 100, unit: QuantityUnit.SERVINGS, radius: 15, latitude: 12.937, longitude: 77.629, vehicle: "FOUR_WHEELER", available: true },
  { key: "karthik", email: "vol.karthik@rescueplate.org", name: "Karthik Rao", capacity: 50, unit: QuantityUnit.SERVINGS, radius: 10, latitude: 12.915, longitude: 77.64, vehicle: "TWO_WHEELER", available: true },
  { key: "meera", email: "vol.meera@rescueplate.org", name: "Meera Nair", capacity: 60, unit: QuantityUnit.SERVINGS, radius: 10, latitude: 12.97, longitude: 77.64, vehicle: "TWO_WHEELER", available: true },
  { key: "farah", email: "vol.farah@rescueplate.org", name: "Farah Khan", capacity: 20, unit: QuantityUnit.SERVINGS, radius: 3, latitude: 12.93, longitude: 77.58, vehicle: "ON_FOOT", available: false },
  { key: "dev", email: "vol.dev@rescueplate.org", name: "Dev Narayan", capacity: 40, unit: QuantityUnit.KG, radius: 8, latitude: 12.918, longitude: 77.61, vehicle: "TWO_WHEELER", available: true },
  { key: "isha", email: "vol.isha@rescueplate.org", name: "Isha Kulkarni", capacity: 40, unit: QuantityUnit.PACKETS, radius: 6, latitude: 12.945, longitude: 77.61, vehicle: "ON_FOOT", available: true },
  { key: "rohan", email: "vol.rohan@rescueplate.org", name: "Rohan Shetty", capacity: 120, unit: QuantityUnit.SERVINGS, radius: 20, latitude: 12.95, longitude: 77.62, vehicle: "FOUR_WHEELER", available: true },
] as const;

const capacityWindows = [
  { id: "cw-annapurna-today", ngo: "annapurna", unit: QuantityUnit.SERVINGS, capacity: 60, notes: "Up to 60 meal portions per live pickup window." },
  { id: "cw-annapurna-kg", ngo: "annapurna", unit: QuantityUnit.KG, capacity: 30, notes: "Small chilled produce intake." },
  { id: "cw-hungerrelief-today", ngo: "hungerrelief", unit: QuantityUnit.SERVINGS, capacity: 40, notes: "Evening community kitchen meal intake." },
  { id: "cw-hungerrelief-kg", ngo: "hungerrelief", unit: QuantityUnit.KG, capacity: 50, notes: "Produce storage capacity." },
  { id: "cw-hungerrelief-boxes", ngo: "hungerrelief", unit: QuantityUnit.BOXES, capacity: 40, notes: "Sealed grocery box intake." },
  { id: "cw-sneha-today", ngo: "sneha", unit: QuantityUnit.SERVINGS, capacity: 50, notes: "Children shelter meal intake." },
  { id: "cw-sneha-kg", ngo: "sneha", unit: QuantityUnit.KG, capacity: 20, notes: "Limited fresh produce storage." },
  { id: "cw-sahaara-kg", ngo: "sahaara", unit: QuantityUnit.KG, capacity: 80, notes: "Main fresh-food pantry receiving capacity." },
  { id: "cw-sahaara-boxes", ngo: "sahaara", unit: QuantityUnit.BOXES, capacity: 30, notes: "Sealed pantry box intake." },
] as const;

type DemoEvent = {
  stage: "COLLECTION" | "DELIVERY";
  verifiedQuantity: number;
  rejectedQuantity?: number;
  rejectionReason?: string;
  hoursAgo: number;
  notes: string;
};

type DemoAssignment = {
  volunteer: string;
  status: AssignmentStatus;
  isCurrent: boolean;
  acceptedHoursAgo?: number;
  cancelledHoursAgo?: number;
  cancellationReason?: string;
};

type DemoAllocation = {
  id: string;
  ngo: string;
  quantity: number;
  status: AllocationStatus;
  capacityWindowId?: string;
  collectedQuantity?: number;
  deliveredQuantity?: number;
  rejectedQuantity?: number;
  rejectionReason?: string;
  assignments?: DemoAssignment[];
  events?: DemoEvent[];
};

type DemoDonation = {
  id: string;
  donor: string;
  title: string;
  itemName: string;
  category: FoodCategory;
  quantity: number;
  unit: QuantityUnit;
  status: DonationStatus;
  startOffsetMinutes: number;
  endOffsetMinutes: number;
  storage: StorageInfo;
  packaging: PackagingInfo;
  allocation?: DemoAllocation;
};

const demoDonations: DemoDonation[] = [
  {
    id: "donation-historical-completed-1",
    donor: "caterer",
    title: "Recovered Banquet Meals: Pulao & Paneer Curry",
    itemName: "Vegetable Pulao & Paneer Gravy",
    category: FoodCategory.COOKED_MEALS,
    quantity: 50,
    unit: QuantityUnit.SERVINGS,
    status: DonationStatus.CLOSED,
    startOffsetMinutes: -48 * 60,
    endOffsetMinutes: -44 * 60,
    storage: StorageInfo.HOT_HOLD,
    packaging: PackagingInfo.SEALED_CONTAINERS,
    allocation: {
      id: "alloc-historical-1",
      ngo: "annapurna",
      quantity: 50,
      status: AllocationStatus.PARTIALLY_DELIVERED,
      collectedQuantity: 50,
      deliveredQuantity: 48,
      rejectedQuantity: 2,
      rejectionReason: "Two container seals were damaged during transport.",
      assignments: [
        {
          volunteer: "aarav",
          status: AssignmentStatus.CANCELLED,
          isCurrent: false,
          cancelledHoursAgo: 47,
          cancellationReason: "Vehicle issue; backup requested.",
        },
        {
          volunteer: "priya",
          status: AssignmentStatus.COMPLETED,
          isCurrent: true,
          acceptedHoursAgo: 46,
        },
      ],
      events: [
        { stage: "COLLECTION", verifiedQuantity: 50, hoursAgo: 46, notes: "Backup runner verified sealed hot-hold containers." },
        { stage: "DELIVERY", verifiedQuantity: 48, rejectedQuantity: 2, rejectionReason: "Two container seals were damaged during transport.", hoursAgo: 45, notes: "Recipient counted 48 accepted servings." },
      ],
    },
  },
  {
    id: "donation-demo-campus-100",
    donor: "campus",
    title: "Campus Lunch Surplus: Fresh Dal, Jeera Rice & Subzi",
    itemName: "Dal, Jeera Rice & Subzi Combo",
    category: FoodCategory.COOKED_MEALS,
    quantity: 100,
    unit: QuantityUnit.SERVINGS,
    status: DonationStatus.OPEN,
    startOffsetMinutes: 5,
    endOffsetMinutes: 120,
    storage: StorageInfo.HOT_HOLD,
    packaging: PackagingInfo.BULK_VESSELS,
  },
  {
    id: "donation-demo-restaurant",
    donor: "restaurant",
    title: "Namma Table: Vegetable Idli & Sambar",
    itemName: "Idli and Sambar Meal",
    category: FoodCategory.COOKED_MEALS,
    quantity: 35,
    unit: QuantityUnit.SERVINGS,
    status: DonationStatus.OPEN,
    startOffsetMinutes: 10,
    endOffsetMinutes: 100,
    storage: StorageInfo.HOT_HOLD,
    packaging: PackagingInfo.SEALED_CONTAINERS,
  },
  {
    id: "donation-demo-caterer-boxes",
    donor: "caterer",
    title: "Grand Pavilion: Sealed Event Meal Boxes",
    itemName: "Vegetarian Event Meal Boxes",
    category: FoodCategory.PACKAGED_FOOD,
    quantity: 40,
    unit: QuantityUnit.BOXES,
    status: DonationStatus.OPEN,
    startOffsetMinutes: 15,
    endOffsetMinutes: 110,
    storage: StorageInfo.AMBIENT,
    packaging: PackagingInfo.BOXED,
  },
  {
    id: "donation-demo-bakery",
    donor: "bakery",
    title: "GreenHarvest: Fresh Bread & Salad Produce",
    itemName: "Bread and Salad Produce",
    category: FoodCategory.BAKERY,
    quantity: 20,
    unit: QuantityUnit.KG,
    status: DonationStatus.PARTIALLY_ALLOCATED,
    startOffsetMinutes: 20,
    endOffsetMinutes: 115,
    storage: StorageInfo.REFRIGERATED,
    packaging: PackagingInfo.BOXED,
    allocation: {
      id: "alloc-demo-bakery",
      ngo: "sneha",
      quantity: 5,
      status: AllocationStatus.ACCEPTED,
      capacityWindowId: "cw-sneha-kg",
    },
  },
  {
    id: "donation-demo-produce",
    donor: "commissary",
    title: "BTM Commissary: Seasonal Fresh Vegetables",
    itemName: "Mixed Seasonal Vegetables",
    category: FoodCategory.RAW_PRODUCE,
    quantity: 80,
    unit: QuantityUnit.KG,
    status: DonationStatus.OPEN,
    startOffsetMinutes: 10,
    endOffsetMinutes: 105,
    storage: StorageInfo.REFRIGERATED,
    packaging: PackagingInfo.BOXED,
  },
  {
    id: "donation-demo-assigned",
    donor: "restaurant",
    title: "Restaurant Dinner: Lemon Rice Meal Packs",
    itemName: "Lemon Rice Meal Packs",
    category: FoodCategory.COOKED_MEALS,
    quantity: 25,
    unit: QuantityUnit.SERVINGS,
    status: DonationStatus.FULLY_ALLOCATED,
    startOffsetMinutes: 25,
    endOffsetMinutes: 105,
    storage: StorageInfo.HOT_HOLD,
    packaging: PackagingInfo.PACKETED,
    allocation: {
      id: "alloc-demo-assigned",
      ngo: "hungerrelief",
      quantity: 25,
      status: AllocationStatus.ASSIGNED,
      capacityWindowId: "cw-hungerrelief-today",
      assignments: [{
        volunteer: "rohan",
        status: AssignmentStatus.ACCEPTED,
        isCurrent: true,
        acceptedHoursAgo: 0,
      }],
    },
  },
  {
    id: "donation-demo-expired",
    donor: "restaurant",
    title: "Expired Listing: Yesterday's Leftover Meal Packs",
    itemName: "Expired Meal Packs",
    category: FoodCategory.COOKED_MEALS,
    quantity: 18,
    unit: QuantityUnit.SERVINGS,
    status: DonationStatus.EXPIRED,
    startOffsetMinutes: -420,
    endOffsetMinutes: -300,
    storage: StorageInfo.HOT_HOLD,
    packaging: PackagingInfo.SEALED_CONTAINERS,
  },
  {
    id: "donation-demo-rejected",
    donor: "campus",
    title: "Closed Rescue: Damaged Meal Containers",
    itemName: "Campus Dinner Portions",
    category: FoodCategory.COOKED_MEALS,
    quantity: 12,
    unit: QuantityUnit.SERVINGS,
    status: DonationStatus.CLOSED,
    startOffsetMinutes: -36 * 60,
    endOffsetMinutes: -34 * 60,
    storage: StorageInfo.HOT_HOLD,
    packaging: PackagingInfo.BULK_VESSELS,
    allocation: {
      id: "alloc-demo-rejected",
      ngo: "annapurna",
      quantity: 12,
      status: AllocationStatus.REJECTED,
      collectedQuantity: 12,
      rejectedQuantity: 12,
      rejectionReason: "Temperature and container seal failed inspection.",
      assignments: [{
        volunteer: "meera",
        status: AssignmentStatus.FAILED,
        isCurrent: true,
        acceptedHoursAgo: 35,
      }],
      events: [
        { stage: "COLLECTION", verifiedQuantity: 12, hoursAgo: 35, notes: "Donor handover recorded." },
        { stage: "DELIVERY", verifiedQuantity: 0, rejectedQuantity: 12, rejectionReason: "Temperature and container seal failed inspection.", hoursAgo: 34, notes: "Recipient rejected the full batch." },
      ],
    },
  },
  {
    id: "donation-demo-completed",
    donor: "commissary",
    title: "Completed Rescue: Fresh Vegetable Curry",
    itemName: "Vegetable Curry Portions",
    category: FoodCategory.COOKED_MEALS,
    quantity: 32,
    unit: QuantityUnit.SERVINGS,
    status: DonationStatus.CLOSED,
    startOffsetMinutes: -30 * 60,
    endOffsetMinutes: -28 * 60,
    storage: StorageInfo.HOT_HOLD,
    packaging: PackagingInfo.SEALED_CONTAINERS,
    allocation: {
      id: "alloc-demo-completed",
      ngo: "sneha",
      quantity: 32,
      status: AllocationStatus.DELIVERED,
      collectedQuantity: 32,
      deliveredQuantity: 32,
      assignments: [{
        volunteer: "karthik",
        status: AssignmentStatus.COMPLETED,
        isCurrent: true,
        acceptedHoursAgo: 29,
      }],
      events: [
        { stage: "COLLECTION", verifiedQuantity: 32, hoursAgo: 29, notes: "Collection verified at the donor site." },
        { stage: "DELIVERY", verifiedQuantity: 32, hoursAgo: 28, notes: "All portions accepted by the shelter." },
      ],
    },
  },
  {
    id: "donation-demo-packages",
    donor: "bakery",
    title: "GreenHarvest: Sealed Breakfast Packs",
    itemName: "Breakfast Packs",
    category: FoodCategory.PACKAGED_FOOD,
    quantity: 24,
    unit: QuantityUnit.BOXES,
    status: DonationStatus.OPEN,
    startOffsetMinutes: 15,
    endOffsetMinutes: 100,
    storage: StorageInfo.AMBIENT,
    packaging: PackagingInfo.BOXED,
  },
  {
    id: "donation-demo-evening",
    donor: "campus",
    title: "Campus Evening Surplus: Vegetable Khichdi",
    itemName: "Vegetable Khichdi",
    category: FoodCategory.COOKED_MEALS,
    quantity: 45,
    unit: QuantityUnit.SERVINGS,
    status: DonationStatus.OPEN,
    startOffsetMinutes: 30,
    endOffsetMinutes: 115,
    storage: StorageInfo.HOT_HOLD,
    packaging: PackagingInfo.SEALED_CONTAINERS,
  },
];

const allEmails = [
  "admin@rescueplate.org",
  ...donors.map((donor) => donor.email),
  ...ngos.map((ngo) => ngo.email),
  ...volunteers.map((volunteer) => volunteer.email),
];

async function clearDemoDataset(): Promise<void> {
  const demoDonorIds = donors.map((donor) => donor.id);
  const donations = await prisma.donation.findMany({
    where: { donorOrgId: { in: demoDonorIds } },
    select: { id: true },
  });
  const donationIds = donations.map((donation) => donation.id);
  const allocations = donationIds.length
    ? await prisma.allocation.findMany({
        where: { donationId: { in: donationIds } },
        select: { id: true },
      })
    : [];
  const allocationIds = allocations.map((allocation) => allocation.id);
  const assignments = allocationIds.length
    ? await prisma.assignment.findMany({
        where: { allocationId: { in: allocationIds } },
        select: { id: true },
      })
    : [];
  const assignmentIds = assignments.map((assignment) => assignment.id);
  const users = await prisma.user.findMany({
    where: { email: { in: allEmails } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  if (allocationIds.length) {
    await prisma.handoverEvent.deleteMany({ where: { allocationId: { in: allocationIds } } });
    await prisma.handoverChallenge.deleteMany({ where: { allocationId: { in: allocationIds } } });
    await prisma.incident.deleteMany({ where: { allocationId: { in: allocationIds } } });
  }
  if (assignmentIds.length) {
    await prisma.assignmentOffer.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    await prisma.assignment.deleteMany({ where: { id: { in: assignmentIds } } });
  }
  if (allocationIds.length) {
    await prisma.allocation.deleteMany({ where: { id: { in: allocationIds } } });
  }
  if (donationIds.length) {
    await prisma.donationItem.deleteMany({ where: { donationId: { in: donationIds } } });
    await prisma.donation.deleteMany({ where: { id: { in: donationIds } } });
  }
  if (donationIds.length || allocationIds.length || assignmentIds.length) {
    await prisma.auditEvent.deleteMany({
      where: { entityId: { in: [...donationIds, ...allocationIds, ...assignmentIds] } },
    });
  }
  if (userIds.length) {
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  }

  await prisma.capacityWindow.updateMany({
    where: { organisationId: { in: ngos.map((ngo) => ngo.id) } },
    data: { reservedCapacity: 0, receivedCapacity: 0 },
  });
}

export async function seedDemoData(): Promise<{ donors: number; ngos: number; volunteers: number; donations: number }> {
  await clearDemoDataset();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = new Date();

  const admin = await prisma.user.upsert({
    where: { email: "admin@rescueplate.org" },
    update: { passwordHash, isActive: true, isSuspended: false },
    create: {
      email: "admin@rescueplate.org",
      passwordHash,
      name: "Radha Krishnan (Admin)",
      phone: "+91-9876543210",
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const donorOrgByKey = new Map<string, { id: string; name: string; address: string; latitude: number; longitude: number }>();
  const donorUserByKey = new Map<string, string>();
  for (const donor of donors) {
    const organisation = await prisma.organisation.upsert({
      where: { id: donor.id },
      update: {
        name: donor.name,
        description: donor.description,
        address: donor.address,
        latitude: donor.latitude,
        longitude: donor.longitude,
        operatingHoursStart: "06:00",
        operatingHoursEnd: "23:59",
        isVerified: true,
        isSuspended: false,
      },
      create: {
        id: donor.id,
        name: donor.name,
        type: OrgType.DONOR,
        description: donor.description,
        address: donor.address,
        latitude: donor.latitude,
        longitude: donor.longitude,
        operatingHoursStart: "06:00",
        operatingHoursEnd: "23:59",
        isVerified: true,
      },
    });
    donorOrgByKey.set(donor.key, organisation);
    const user = await prisma.user.upsert({
      where: { email: donor.email },
      update: { passwordHash, name: donor.contact, role: Role.DONOR, isActive: true, isSuspended: false },
      create: {
        email: donor.email,
        passwordHash,
        name: donor.contact,
        role: Role.DONOR,
        phone: "+91-9000000000",
      },
    });
    donorUserByKey.set(donor.key, user.id);
    await prisma.organisationMembership.upsert({
      where: { userId_organisationId: { userId: user.id, organisationId: organisation.id } },
      update: { roleInOrg: "OWNER" },
      create: { userId: user.id, organisationId: organisation.id, roleInOrg: "OWNER" },
    });
  }

  const ngoOrgByKey = new Map<string, { id: string; address: string; latitude: number; longitude: number }>();
  for (const ngo of ngos) {
    const organisation = await prisma.organisation.upsert({
      where: { id: ngo.id },
      update: {
        name: ngo.name,
        description: ngo.description,
        address: ngo.address,
        latitude: ngo.latitude,
        longitude: ngo.longitude,
        operatingHoursStart: ngo.operatingHoursStart,
        operatingHoursEnd: ngo.operatingHoursEnd,
        collectionRadiusKm: ngo.collectionRadiusKm,
        acceptedCategories: JSON.stringify(ngo.acceptedCategories),
        isVerified: true,
        isSuspended: false,
      },
      create: {
        id: ngo.id,
        name: ngo.name,
        type: OrgType.NGO,
        description: ngo.description,
        address: ngo.address,
        latitude: ngo.latitude,
        longitude: ngo.longitude,
        operatingHoursStart: ngo.operatingHoursStart,
        operatingHoursEnd: ngo.operatingHoursEnd,
        collectionRadiusKm: ngo.collectionRadiusKm,
        acceptedCategories: JSON.stringify(ngo.acceptedCategories),
        isVerified: true,
      },
    });
    ngoOrgByKey.set(ngo.key, organisation);
    const user = await prisma.user.upsert({
      where: { email: ngo.email },
      update: { passwordHash, name: ngo.contact, role: Role.NGO, isActive: true, isSuspended: false },
      create: {
        email: ngo.email,
        passwordHash,
        name: ngo.contact,
        role: Role.NGO,
        phone: "+91-9100000000",
      },
    });
    await prisma.organisationMembership.upsert({
      where: { userId_organisationId: { userId: user.id, organisationId: organisation.id } },
      update: { roleInOrg: "OWNER" },
      create: { userId: user.id, organisationId: organisation.id, roleInOrg: "OWNER" },
    });
  }

  const volunteerUserByKey = new Map<string, string>();
  for (const volunteer of volunteers) {
    const user = await prisma.user.upsert({
      where: { email: volunteer.email },
      update: { passwordHash, name: volunteer.name, role: Role.VOLUNTEER, isActive: true, isSuspended: false },
      create: {
        email: volunteer.email,
        passwordHash,
        name: volunteer.name,
        role: Role.VOLUNTEER,
        phone: "+91-9200000000",
      },
    });
    volunteerUserByKey.set(volunteer.key, user.id);
    await prisma.volunteerProfile.upsert({
      where: { userId: user.id },
      update: {
        isAvailable: volunteer.available,
        maxCarryingCapacity: volunteer.capacity,
        capacityUnit: volunteer.unit,
        operatingRadiusKm: volunteer.radius,
        latitude: volunteer.latitude,
        longitude: volunteer.longitude,
        vehicleType: volunteer.vehicle,
      },
      create: {
        userId: user.id,
        isAvailable: volunteer.available,
        maxCarryingCapacity: volunteer.capacity,
        capacityUnit: volunteer.unit,
        operatingRadiusKm: volunteer.radius,
        latitude: volunteer.latitude,
        longitude: volunteer.longitude,
        vehicleType: volunteer.vehicle,
      },
    });
  }

  const windowStart = new Date(now.getTime() - 10 * 60_000);
  const windowEnd = new Date(now.getTime() + 6 * 60 * 60_000);
  for (const window of capacityWindows) {
    const organisation = ngoOrgByKey.get(window.ngo)!;
    await prisma.capacityWindow.upsert({
      where: { id: window.id },
      update: {
        organisationId: organisation.id,
        startTime: windowStart,
        endTime: windowEnd,
        unit: window.unit,
        maxCapacity: window.capacity,
        reservedCapacity: 0,
        receivedCapacity: 0,
        notes: window.notes,
      },
      create: {
        id: window.id,
        organisationId: organisation.id,
        startTime: windowStart,
        endTime: windowEnd,
        unit: window.unit,
        maxCapacity: window.capacity,
        notes: window.notes,
      },
    });
  }

  for (const spec of demoDonations) {
    const donor = donorOrgByKey.get(spec.donor)!;
    const donation = await prisma.donation.create({
      data: {
        id: spec.id,
        donorOrgId: donor.id,
        createdByUserId: donorUserByKey.get(spec.donor)!,
        title: spec.title,
        foodCategory: spec.category,
        dietaryTags: JSON.stringify(spec.category === FoodCategory.COOKED_MEALS ? ["VEGETARIAN"] : []),
        ingredients: spec.itemName,
        allergens: JSON.stringify(["UNKNOWN"]),
        storageInfo: spec.storage,
        packagingInfo: spec.packaging,
        preparationTime: spec.startOffsetMinutes < 0
          ? new Date(now.getTime() + (spec.startOffsetMinutes - 60) * 60_000)
          : now,
        pickupAddress: donor.address,
        latitude: donor.latitude,
        longitude: donor.longitude,
        pickupWindowStart: new Date(now.getTime() + spec.startOffsetMinutes * 60_000),
        pickupWindowEnd: new Date(now.getTime() + spec.endOffsetMinutes * 60_000),
        status: spec.status,
        handlingNotes: "Synthetic demo data. Recipient should inspect condition and packaging at handover.",
        items: {
          create: {
            id: `item-${spec.id}`,
            name: spec.itemName,
            quantity: spec.quantity,
            unit: spec.unit,
            estimatedServings: spec.unit === QuantityUnit.SERVINGS ? spec.quantity : null,
            allocatedQuantity: spec.allocation?.quantity ?? 0,
            collectedQuantity: spec.allocation?.collectedQuantity ?? 0,
            deliveredQuantity: spec.allocation?.deliveredQuantity ?? 0,
          },
        },
      },
    });

    if (!spec.allocation) continue;
    const allocationSpec = spec.allocation;
    const ngo = ngoOrgByKey.get(allocationSpec.ngo)!;
    const allocation = await prisma.allocation.create({
      data: {
        id: allocationSpec.id,
        donationId: donation.id,
        donationItemId: `item-${spec.id}`,
        ngoOrgId: ngo.id,
        capacityWindowId: allocationSpec.capacityWindowId,
        allocatedQuantity: allocationSpec.quantity,
        unit: spec.unit,
        status: allocationSpec.status,
        snapshotItemDetails: JSON.stringify({
          itemName: spec.itemName,
          foodCategory: spec.category,
          storageInfo: spec.storage,
          packagingInfo: spec.packaging,
          donorOrgName: donor.name,
        }),
        collectedQuantity: allocationSpec.collectedQuantity,
        deliveredQuantity: allocationSpec.deliveredQuantity,
        rejectedQuantity: allocationSpec.rejectedQuantity,
        rejectionReason: allocationSpec.rejectionReason,
      },
    });

    if (allocationSpec.capacityWindowId) {
      const received = allocationSpec.deliveredQuantity ?? 0;
      const reserved = ["ACCEPTED", "AWAITING_VOLUNTEER", "ASSIGNED"].includes(allocationSpec.status)
        ? allocationSpec.quantity
        : 0;
      await prisma.capacityWindow.update({
        where: { id: allocationSpec.capacityWindowId },
        data: {
          reservedCapacity: { increment: reserved },
          receivedCapacity: { increment: received },
        },
      });
    }

    for (const assignmentSpec of allocationSpec.assignments ?? []) {
      const volunteerUserId = volunteerUserByKey.get(assignmentSpec.volunteer)!;
      const acceptedAt = assignmentSpec.acceptedHoursAgo === undefined
        ? null
        : new Date(now.getTime() - assignmentSpec.acceptedHoursAgo * 60 * 60_000);
      const cancelledAt = assignmentSpec.cancelledHoursAgo === undefined
        ? null
        : new Date(now.getTime() - assignmentSpec.cancelledHoursAgo * 60 * 60_000);
      await prisma.assignment.create({
        data: {
          allocationId: allocation.id,
          volunteerUserId,
          status: assignmentSpec.status,
          isCurrent: assignmentSpec.isCurrent,
          offerExpiresAt: new Date(now.getTime() + 30 * 60_000),
          acceptedAt,
          cancelledAt,
          cancellationReason: assignmentSpec.cancellationReason,
          notes: assignmentSpec.isCurrent
            ? "Seeded demo assignment."
            : "Prior assignment retained for rescue history.",
        },
      });
    }

    for (const event of allocationSpec.events ?? []) {
      await prisma.handoverEvent.create({
        data: {
          allocationId: allocation.id,
          stage: event.stage,
          actorUserId: volunteerUserByKey.get("priya")!,
          verifiedQuantity: event.verifiedQuantity,
          rejectedQuantity: event.rejectedQuantity ?? 0,
          rejectionReason: event.rejectionReason,
          inspectionNotes: event.notes,
          timestamp: new Date(now.getTime() - event.hoursAgo * 60 * 60_000),
        },
      });
    }
  }

  console.log("Demo dataset reset and seeded for Bengaluru.");
  console.log(`  Donors: ${donors.length}; NGOs: ${ngos.length}; volunteers: ${volunteers.length}; donations: ${demoDonations.length}`);
  console.log(`  Demo login password: ${DEMO_PASSWORD}`);
  console.log(`  Admin account: ${admin.email}`);
  return {
    donors: donors.length,
    ngos: ngos.length,
    volunteers: volunteers.length,
    donations: demoDonations.length,
  };
}

if (require.main === module) {
  seedDemoData()
    .catch((error: unknown) => {
      console.error("Demo data seed failed:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
