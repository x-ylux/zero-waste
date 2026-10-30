CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE "Role" AS ENUM ('donor', 'ngo', 'volunteer', 'admin');
CREATE TYPE "DonationStatus" AS ENUM ('available', 'reserved', 'collected', 'delivered', 'cancelled', 'expired', 'rejected');
CREATE TYPE "TaskStatus" AS ENUM ('unassigned', 'assigned', 'picked_up', 'delivered', 'backup_needed', 'cancelled');
CREATE TYPE "FoodCategory" AS ENUM ('cooked_meals', 'packaged_food', 'produce', 'bakery', 'dairy', 'beverages', 'other');
CREATE TYPE "QuantityUnit" AS ENUM ('servings', 'kg', 'packets', 'boxes');

CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "role" "Role" NOT NULL,
  "phone" TEXT,
  "orgId" TEXT,
  "volunteerId" TEXT
);

CREATE TABLE "donor_orgs" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "location" geography(Point,4326)
);

CREATE TABLE "ngo_profiles" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "coordinatorName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "location" geography(Point,4326),
  "acceptedCategories" TEXT NOT NULL,
  "dietaryRequirements" TEXT NOT NULL,
  "storageCapabilities" TEXT NOT NULL,
  "handlingCapabilities" TEXT NOT NULL,
  "receivingHoursStart" TEXT NOT NULL,
  "receivingHoursEnd" TEXT NOT NULL,
  "maxAcceptableQuantity" INTEGER NOT NULL,
  "quantityUnit" "QuantityUnit" NOT NULL,
  "lastCompletedDonationAt" TIMESTAMP(3)
);

CREATE TABLE "volunteer_profiles" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "location" geography(Point,4326),
  "available" BOOLEAN NOT NULL,
  "standby" BOOLEAN NOT NULL,
  "transportType" TEXT NOT NULL,
  "carryingCapacity" INTEGER NOT NULL,
  "capacityUnit" "QuantityUnit" NOT NULL,
  "handlingCapabilities" TEXT NOT NULL,
  "notes" TEXT
);

CREATE TABLE "donations" (
  "id" TEXT PRIMARY KEY,
  "donorOrgId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" "FoodCategory" NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unit" "QuantityUnit" NOT NULL,
  "estimatedPortions" DOUBLE PRECISION,
  "dietaryTags" TEXT NOT NULL,
  "allergens" TEXT NOT NULL,
  "preparedAt" TIMESTAMP(3),
  "storage" TEXT NOT NULL,
  "handlingRequirements" TEXT NOT NULL,
  "packagingAvailable" BOOLEAN NOT NULL,
  "pickupAddress" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "location" geography(Point,4326),
  "pickupWindowStart" TIMESTAMP(3) NOT NULL,
  "pickupWindowEnd" TIMESTAMP(3) NOT NULL,
  "contactName" TEXT NOT NULL,
  "contactPhone" TEXT NOT NULL,
  "photoDataUrl" TEXT,
  "handlingAcknowledged" BOOLEAN NOT NULL,
  "status" "DonationStatus" NOT NULL,
  "reservedNgoId" TEXT,
  "acceptedQuantity" DOUBLE PRECISION,
  "rejectionReason" TEXT,
  "cancellationReason" TEXT,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "donations_donorOrgId_fkey" FOREIGN KEY ("donorOrgId") REFERENCES "donor_orgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "needs_requests" (
  "id" TEXT PRIMARY KEY,
  "ngoId" TEXT NOT NULL UNIQUE,
  "requiredCategories" TEXT NOT NULL,
  "requestedQuantity" DOUBLE PRECISION NOT NULL,
  "quantityUnit" "QuantityUnit" NOT NULL,
  "dietaryRequirements" TEXT NOT NULL,
  "receivingHoursStart" TEXT NOT NULL,
  "receivingHoursEnd" TEXT NOT NULL,
  "storageCapabilities" TEXT NOT NULL,
  "handlingCapabilities" TEXT NOT NULL,
  "maxAcceptableQuantity" DOUBLE PRECISION NOT NULL,
  "deliveryAddress" TEXT NOT NULL,
  "deliveryLat" DOUBLE PRECISION NOT NULL,
  "deliveryLng" DOUBLE PRECISION NOT NULL,
  "notes" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "needs_requests_ngoId_fkey" FOREIGN KEY ("ngoId") REFERENCES "ngo_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "rescue_tasks" (
  "id" TEXT PRIMARY KEY,
  "donationId" TEXT NOT NULL,
  "ngoId" TEXT NOT NULL,
  "volunteerId" TEXT,
  "status" "TaskStatus" NOT NULL,
  "standbyNotifiedIds" TEXT NOT NULL,
  "cancellationReason" TEXT,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rescue_tasks_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "rescue_tasks_ngoId_fkey" FOREIGN KEY ("ngoId") REFERENCES "ngo_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "rescue_tasks_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "volunteer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "handoff_events" (
  "id" TEXT PRIMARY KEY,
  "donationId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "actorRole" "Role" NOT NULL,
  "quantity" DOUBLE PRECISION,
  "notes" TEXT,
  "method" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "handoff_events_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "handoff_events_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "rescue_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "handoff_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "timeline_events" (
  "id" TEXT PRIMARY KEY,
  "donationId" TEXT NOT NULL,
  "taskId" TEXT,
  "label" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "actorUserId" TEXT,
  CONSTRAINT "timeline_events_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "notifications" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "simulated" BOOLEAN NOT NULL DEFAULT true,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "relatedDonationId" TEXT,
  "relatedTaskId" TEXT,
  CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "incident_reports" (
  "id" TEXT PRIMARY KEY,
  "donationId" TEXT,
  "taskId" TEXT,
  "reporterUserId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "incident_reports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "failure_records" (
  "id" TEXT PRIMARY KEY,
  "donationId" TEXT,
  "taskId" TEXT,
  "reason" TEXT NOT NULL,
  "notes" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "impact_config" (
  "id" TEXT PRIMARY KEY DEFAULT 'default',
  "mealEquivalentServings" DOUBLE PRECISION NOT NULL,
  "mealEquivalentKg" DOUBLE PRECISION NOT NULL,
  "mealEquivalentPackets" DOUBLE PRECISION NOT NULL,
  "mealEquivalentBoxes" DOUBLE PRECISION NOT NULL,
  "kgCo2ePerMealEquivalent" DOUBLE PRECISION NOT NULL,
  "notes" TEXT NOT NULL
);

CREATE TABLE "app_snapshots" (
  "id" TEXT PRIMARY KEY DEFAULT 'default',
  "state" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX donor_orgs_location_gix ON "donor_orgs" USING GIST ("location");
CREATE INDEX ngo_profiles_location_gix ON "ngo_profiles" USING GIST ("location");
CREATE INDEX volunteer_profiles_location_gix ON "volunteer_profiles" USING GIST ("location");
CREATE INDEX donations_location_gix ON "donations" USING GIST ("location");

CREATE OR REPLACE FUNCTION sync_geog_point() RETURNS trigger AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER donor_orgs_geog BEFORE INSERT OR UPDATE ON "donor_orgs"
FOR EACH ROW EXECUTE FUNCTION sync_geog_point();
CREATE TRIGGER ngo_profiles_geog BEFORE INSERT OR UPDATE ON "ngo_profiles"
FOR EACH ROW EXECUTE FUNCTION sync_geog_point();
CREATE TRIGGER volunteer_profiles_geog BEFORE INSERT OR UPDATE ON "volunteer_profiles"
FOR EACH ROW EXECUTE FUNCTION sync_geog_point();
CREATE TRIGGER donations_geog BEFORE INSERT OR UPDATE ON "donations"
FOR EACH ROW EXECUTE FUNCTION sync_geog_point();
