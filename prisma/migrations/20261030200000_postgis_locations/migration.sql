ALTER TABLE "organisations"
ADD COLUMN "location" geography(Point,4326);

ALTER TABLE "volunteer_profiles"
ADD COLUMN "location" geography(Point,4326);

ALTER TABLE "donations"
ADD COLUMN "location" geography(Point,4326);

UPDATE "organisations"
SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography;

UPDATE "volunteer_profiles"
SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography;

UPDATE "donations"
SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography;

CREATE FUNCTION sync_geography_location() RETURNS TRIGGER AS $$
BEGIN
  NEW."location" := ST_SetSRID(ST_MakePoint(NEW."longitude", NEW."latitude"), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "organisations_sync_location"
BEFORE INSERT OR UPDATE OF "latitude", "longitude" ON "organisations"
FOR EACH ROW EXECUTE FUNCTION sync_geography_location();

CREATE TRIGGER "volunteer_profiles_sync_location"
BEFORE INSERT OR UPDATE OF "latitude", "longitude" ON "volunteer_profiles"
FOR EACH ROW EXECUTE FUNCTION sync_geography_location();

CREATE TRIGGER "donations_sync_location"
BEFORE INSERT OR UPDATE OF "latitude", "longitude" ON "donations"
FOR EACH ROW EXECUTE FUNCTION sync_geography_location();

CREATE INDEX "organisations_location_gist_idx"
ON "organisations" USING GIST ("location");

CREATE INDEX "volunteer_profiles_location_gist_idx"
ON "volunteer_profiles" USING GIST ("location");

CREATE INDEX "donations_location_gist_idx"
ON "donations" USING GIST ("location");
