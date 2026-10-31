CREATE TYPE "NgoRecipientType" AS ENUM ('community', 'animal_shelter');

ALTER TABLE "ngo_profiles"
ADD COLUMN "recipientType" "NgoRecipientType" NOT NULL DEFAULT 'community';

ALTER TABLE "donations"
ADD COLUMN "animalShelterOnly" BOOLEAN NOT NULL DEFAULT false;
