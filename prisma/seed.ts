import { PrismaClient, OrgType, Role, FoodCategory, QuantityUnit, StorageInfo, PackagingInfo } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function main() {
  console.log("🌱 Starting RescuePlate synthetic seed data generation for Bengaluru...");

  const defaultPassword = await bcrypt.hash("Password123!", 10);

  // 1. Create Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@rescueplate.org" },
    update: {},
    create: {
      email: "admin@rescueplate.org",
      passwordHash: defaultPassword,
      name: "Radha Krishnan (Admin)",
      phone: "+91-9876543210",
      role: Role.ADMIN,
      isActive: true,
    },
  });

  // 2. Create 3 Donors
  // Donor 1: Apex Campus Mess (Koramangala)
  const donorOrg1 = await prisma.organisation.upsert({
    where: { id: "org-donor-apex-campus" },
    update: {},
    create: {
      id: "org-donor-apex-campus",
      name: "Apex University Student Mess",
      type: OrgType.DONOR,
      description: "University hostel central dining hall serving lunch and dinner daily.",
      address: "80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034",
      latitude: 12.9345,
      longitude: 77.6265,
      operatingHoursStart: "07:00",
      operatingHoursEnd: "23:00",
      isVerified: true,
    },
  });

  const donorUser1 = await prisma.user.upsert({
    where: { email: "donor.mess@rescueplate.org" },
    update: {},
    create: {
      email: "donor.mess@rescueplate.org",
      passwordHash: defaultPassword,
      name: "Suresh Patil (Mess Manager)",
      phone: "+91-9811122233",
      role: Role.DONOR,
      memberships: {
        create: {
          organisationId: donorOrg1.id,
          roleInOrg: "OWNER",
        },
      },
    },
  });

  // Donor 2: Grand Pavilion Caterers (Indiranagar)
  const donorOrg2 = await prisma.organisation.upsert({
    where: { id: "org-donor-grand-pavilion" },
    update: {},
    create: {
      id: "org-donor-grand-pavilion",
      name: "Grand Pavilion Banquets & Catering",
      type: OrgType.DONOR,
      description: "Banquet facility catering corporate and family evening gatherings.",
      address: "100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038",
      latitude: 12.9719,
      longitude: 77.6412,
      operatingHoursStart: "09:00",
      operatingHoursEnd: "23:59",
      isVerified: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "donor.caterer@rescueplate.org" },
    update: {},
    create: {
      email: "donor.caterer@rescueplate.org",
      passwordHash: defaultPassword,
      name: "Vikram Singhania (Head Chef)",
      phone: "+91-9822233344",
      role: Role.DONOR,
      memberships: {
        create: {
          organisationId: donorOrg2.id,
          roleInOrg: "OWNER",
        },
      },
    },
  });

  // Donor 3: GreenHarvest Fresh Bistro (MG Road)
  const donorOrg3 = await prisma.organisation.upsert({
    where: { id: "org-donor-greenharvest" },
    update: {},
    create: {
      id: "org-donor-greenharvest",
      name: "GreenHarvest Farm Kitchen",
      type: OrgType.DONOR,
      description: "Health-focused bakery and daily salads kitchen.",
      address: "MG Road, Shanthala Nagar, Ashok Nagar, Bengaluru, Karnataka 560001",
      latitude: 12.9756,
      longitude: 77.6066,
      operatingHoursStart: "08:00",
      operatingHoursEnd: "21:30",
      isVerified: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "donor.bistro@rescueplate.org" },
    update: {},
    create: {
      email: "donor.bistro@rescueplate.org",
      passwordHash: defaultPassword,
      name: "Ananya Deshmukh",
      phone: "+91-9833344455",
      role: Role.DONOR,
      memberships: {
        create: {
          organisationId: donorOrg3.id,
          roleInOrg: "OWNER",
        },
      },
    },
  });

  // 3. Create 3 NGOs
  // NGO 1: Annapurna Seva Kendra (Koramangala / Ejipura)
  const ngoOrg1 = await prisma.organisation.upsert({
    where: { id: "org-ngo-annapurna" },
    update: {},
    create: {
      id: "org-ngo-annapurna",
      name: "Annapurna Seva Kendra",
      type: OrgType.NGO,
      description: "Community dining shelter distributing fresh cooked meals to shelter homes.",
      address: "Ejipura Main Road, Vivek Nagar Post, Bengaluru, Karnataka 560047",
      latitude: 12.9392,
      longitude: 77.6258,
      operatingHoursStart: "08:00",
      operatingHoursEnd: "22:00",
      collectionRadiusKm: 12.0,
      acceptedCategories: JSON.stringify(["COOKED_MEALS", "BAKERY", "PACKAGED_FOOD"]),
      isVerified: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "ngo.annapurna@rescueplate.org" },
    update: {},
    create: {
      email: "ngo.annapurna@rescueplate.org",
      passwordHash: defaultPassword,
      name: "Sister Teresa Mary (Director)",
      phone: "+91-9844455566",
      role: Role.NGO,
      memberships: {
        create: {
          organisationId: ngoOrg1.id,
          roleInOrg: "OWNER",
        },
      },
    },
  });

  // NGO 2: Bengaluru Hunger Relief Mission (HSR Layout)
  const ngoOrg2 = await prisma.organisation.upsert({
    where: { id: "org-ngo-hunger-relief" },
    update: {},
    create: {
      id: "org-ngo-hunger-relief",
      name: "Bengaluru Hunger Relief Mission",
      type: OrgType.NGO,
      description: "Redistributing quality cooked portions and raw groceries to migrant colonies.",
      address: "14th Main Road, Sector 4, HSR Layout, Bengaluru, Karnataka 560102",
      latitude: 12.9121,
      longitude: 77.6446,
      operatingHoursStart: "09:00",
      operatingHoursEnd: "21:00",
      collectionRadiusKm: 15.0,
      acceptedCategories: JSON.stringify(["COOKED_MEALS", "RAW_PRODUCE", "PACKAGED_FOOD"]),
      isVerified: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "ngo.hungerrelief@rescueplate.org" },
    update: {},
    create: {
      email: "ngo.hungerrelief@rescueplate.org",
      passwordHash: defaultPassword,
      name: "Devendra Hegde",
      phone: "+91-9855566677",
      role: Role.NGO,
      memberships: {
        create: {
          organisationId: ngoOrg2.id,
          roleInOrg: "OWNER",
        },
      },
    },
  });

  // NGO 3: Sneha Children Shelter (Domlur)
  const ngoOrg3 = await prisma.organisation.upsert({
    where: { id: "org-ngo-sneha" },
    update: {},
    create: {
      id: "org-ngo-sneha",
      name: "Sneha Children Shelter Foundation",
      type: OrgType.NGO,
      description: "Residential care and education shelter for underprivileged children.",
      address: "Domlur 2nd Stage, Indiranagar, Bengaluru, Karnataka 560071",
      latitude: 12.9609,
      longitude: 77.6387,
      operatingHoursStart: "08:30",
      operatingHoursEnd: "20:30",
      collectionRadiusKm: 10.0,
      acceptedCategories: JSON.stringify(["COOKED_MEALS", "DAIRY", "BAKERY", "RAW_PRODUCE"]),
      isVerified: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "ngo.sneha@rescueplate.org" },
    update: {},
    create: {
      email: "ngo.sneha@rescueplate.org",
      passwordHash: defaultPassword,
      name: "Kavita Rao",
      phone: "+91-9866677788",
      role: Role.NGO,
      memberships: {
        create: {
          organisationId: ngoOrg3.id,
          roleInOrg: "OWNER",
        },
      },
    },
  });

  // Create Capacity Windows for NGOs (today and tomorrow)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0);

  // NGO 1: 60 servings capacity window
  await prisma.capacityWindow.create({
    data: {
      id: "cw-annapurna-today",
      organisationId: ngoOrg1.id,
      startTime: todayStart,
      endTime: todayEnd,
      unit: QuantityUnit.SERVINGS,
      maxCapacity: 60,
      reservedCapacity: 0,
      receivedCapacity: 0,
      notes: "Lunch & Dinner distribution batches",
    },
  });

  // NGO 2: 40 servings capacity window
  await prisma.capacityWindow.create({
    data: {
      id: "cw-hungerrelief-today",
      organisationId: ngoOrg2.id,
      startTime: todayStart,
      endTime: todayEnd,
      unit: QuantityUnit.SERVINGS,
      maxCapacity: 40,
      reservedCapacity: 0,
      receivedCapacity: 0,
      notes: "Evening community kitchen distribution",
    },
  });

  // NGO 3: 50 servings capacity window
  await prisma.capacityWindow.create({
    data: {
      id: "cw-sneha-today",
      organisationId: ngoOrg3.id,
      startTime: todayStart,
      endTime: todayEnd,
      unit: QuantityUnit.SERVINGS,
      maxCapacity: 50,
      reservedCapacity: 0,
      receivedCapacity: 0,
      notes: "Children hostel dinner",
    },
  });

  // 4. Create 4 Volunteers
  // Volunteer 1: Aarav Sharma (Primary volunteer)
  const volUser1 = await prisma.user.upsert({
    where: { email: "vol.aarav@rescueplate.org" },
    update: {},
    create: {
      email: "vol.aarav@rescueplate.org",
      passwordHash: defaultPassword,
      name: "Aarav Sharma",
      phone: "+91-9900011122",
      role: Role.VOLUNTEER,
      volunteerProfile: {
        create: {
          isAvailable: true,
          maxCarryingCapacity: 70,
          capacityUnit: QuantityUnit.SERVINGS,
          operatingRadiusKm: 12.0,
          latitude: 12.935,
          longitude: 77.625, // Koramangala
          vehicleType: "TWO_WHEELER",
        },
      },
    },
  });

  // Volunteer 2: Priya Venkatesh (Backup volunteer)
  const volUser2 = await prisma.user.upsert({
    where: { email: "vol.priya@rescueplate.org" },
    update: {},
    create: {
      email: "vol.priya@rescueplate.org",
      passwordHash: defaultPassword,
      name: "Priya Venkatesh",
      phone: "+91-9900022233",
      role: Role.VOLUNTEER,
      volunteerProfile: {
        create: {
          isAvailable: true,
          maxCarryingCapacity: 80,
          capacityUnit: QuantityUnit.SERVINGS,
          operatingRadiusKm: 15.0,
          latitude: 12.94,
          longitude: 77.63, // Ejipura / Domlur
          vehicleType: "FOUR_WHEELER",
        },
      },
    },
  });

  // Volunteer 3: Karthik Rao (Second backup volunteer)
  await prisma.user.upsert({
    where: { email: "vol.karthik@rescueplate.org" },
    update: {},
    create: {
      email: "vol.karthik@rescueplate.org",
      passwordHash: defaultPassword,
      name: "Karthik Rao",
      phone: "+91-9900033344",
      role: Role.VOLUNTEER,
      volunteerProfile: {
        create: {
          isAvailable: true,
          maxCarryingCapacity: 50,
          capacityUnit: QuantityUnit.SERVINGS,
          operatingRadiusKm: 10.0,
          latitude: 12.915,
          longitude: 77.64, // HSR Layout
          vehicleType: "TWO_WHEELER",
        },
      },
    },
  });

  // Volunteer 4: Meera Nair
  await prisma.user.upsert({
    where: { email: "vol.meera@rescueplate.org" },
    update: {},
    create: {
      email: "vol.meera@rescueplate.org",
      passwordHash: defaultPassword,
      name: "Meera Nair",
      phone: "+91-9900044455",
      role: Role.VOLUNTEER,
      volunteerProfile: {
        create: {
          isAvailable: true,
          maxCarryingCapacity: 60,
          capacityUnit: QuantityUnit.SERVINGS,
          operatingRadiusKm: 10.0,
          latitude: 12.97,
          longitude: 77.64, // Indiranagar
          vehicleType: "TWO_WHEELER",
        },
      },
    },
  });

  // 5. Create a Completed Historical Donation (for realistic dashboard numbers)
  const pastStart = new Date(Date.now() - 48 * 3600 * 1000);
  const pastEnd = new Date(Date.now() - 44 * 3600 * 1000);

  const completedDonation = await prisma.donation.create({
    data: {
      id: "donation-historical-completed-1",
      donorOrgId: donorOrg2.id,
      createdByUserId: donorUser1.id,
      title: "Corporate Banquet Vegetable Pulao & Paneer Curry",
      foodCategory: FoodCategory.COOKED_MEALS,
      dietaryTags: JSON.stringify(["VEGETARIAN"]),
      ingredients: "Basmati rice, mixed seasonal vegetables, paneer, mild spices",
      allergens: JSON.stringify(["DAIRY"]),
      storageInfo: StorageInfo.HOT_HOLD,
      packagingInfo: PackagingInfo.SEALED_CONTAINERS,
      preparationTime: pastStart,
      pickupAddress: donorOrg2.address,
      latitude: donorOrg2.latitude,
      longitude: donorOrg2.longitude,
      pickupWindowStart: pastStart,
      pickupWindowEnd: pastEnd,
      status: "CLOSED",
      handlingNotes: "Inspected at collection. Freshly prepared in food-grade insulated warmers.",
      items: {
        create: {
          id: "item-historical-1",
          name: "Vegetable Pulao & Paneer Gravy",
          quantity: 50,
          unit: QuantityUnit.SERVINGS,
          allocatedQuantity: 50,
          collectedQuantity: 50,
          deliveredQuantity: 50,
        },
      },
    },
    include: { items: true },
  });

  const historicalAlloc = await prisma.allocation.create({
    data: {
      id: "alloc-historical-1",
      donationId: completedDonation.id,
      donationItemId: completedDonation.items[0].id,
      ngoOrgId: ngoOrg1.id,
      allocatedQuantity: 50,
      unit: QuantityUnit.SERVINGS,
      status: "DELIVERED",
      snapshotItemDetails: JSON.stringify({
        name: "Vegetable Pulao & Paneer Gravy",
        storageInfo: "HOT_HOLD",
      }),
      collectedQuantity: 50,
      deliveredQuantity: 50,
      rejectedQuantity: 0,
      handoverEvents: {
        createMany: {
          data: [
            {
              stage: "COLLECTION",
              actorUserId: volUser1.id,
              verifiedQuantity: 50,
              inspectionNotes: "Clean containers, temperature verified warm.",
              timestamp: new Date(Date.now() - 46 * 3600 * 1000),
            },
            {
              stage: "DELIVERY",
              actorUserId: volUser1.id,
              verifiedQuantity: 50,
              inspectionNotes: "Received and distributed at shelter dining room.",
              timestamp: new Date(Date.now() - 45 * 3600 * 1000),
            },
          ],
        },
      },
      assignments: {
        create: {
          volunteerUserId: volUser1.id,
          status: "COMPLETED",
          isCurrent: true,
          offerExpiresAt: pastStart,
          acceptedAt: pastStart,
        },
      },
    },
  });

  // 6. Create the Target Deterministic Demo Donation (100 portions, Campus Mess)
  const pickupStart = new Date(Date.now() + 30 * 60 * 1000); // starts in 30 mins
  const pickupEnd = new Date(Date.now() + 5 * 3600 * 1000);   // deadline in 5 hours

  const demoDonation = await prisma.donation.create({
    data: {
      id: "donation-demo-campus-100",
      donorOrgId: donorOrg1.id,
      createdByUserId: donorUser1.id,
      title: "Campus Lunch Surplus: Fresh Dal, Jeera Rice & Subzi",
      foodCategory: FoodCategory.COOKED_MEALS,
      dietaryTags: JSON.stringify(["VEGETARIAN"]),
      ingredients: "Toor dal, jeera rice, mixed vegetable dry subzi, whole wheat rotis",
      allergens: JSON.stringify(["GLUTEN"]),
      storageInfo: StorageInfo.HOT_HOLD,
      packagingInfo: PackagingInfo.BULK_VESSELS,
      preparationTime: new Date(Date.now() - 60 * 60 * 1000),
      pickupAddress: donorOrg1.address,
      latitude: donorOrg1.latitude,
      longitude: donorOrg1.longitude,
      pickupWindowStart: pickupStart,
      pickupWindowEnd: pickupEnd,
      status: "OPEN",
      handlingNotes: "Packed in stainless steel food-grade insulated canisters. Please bring clean vessels or return canisters within 24 hours.",
      items: {
        create: {
          id: "item-demo-campus-100",
          name: "Dal, Jeera Rice & Subzi Combo",
          quantity: 100,
          unit: QuantityUnit.SERVINGS,
          estimatedServings: 100,
          allocatedQuantity: 0,
          collectedQuantity: 0,
          deliveredQuantity: 0,
        },
      },
    },
  });

  console.log(`✅ Seed successfully completed!`);
  console.log(`   - 1 Admin: admin@rescueplate.org (Password: Password123!)`);
  console.log(`   - 3 Donors: donor.mess@rescueplate.org, donor.caterer@rescueplate.org, donor.bistro@rescueplate.org`);
  console.log(`   - 3 NGOs: ngo.annapurna@rescueplate.org, ngo.hungerrelief@rescueplate.org, ngo.sneha@rescueplate.org`);
  console.log(`   - 4 Volunteers: vol.aarav@rescueplate.org, vol.priya@rescueplate.org, vol.karthik@rescueplate.org, vol.meera@rescueplate.org`);
  console.log(`   - Deterministic Demo Donation: ${demoDonation.id} (100 servings)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

