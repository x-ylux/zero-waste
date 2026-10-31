import { afterEach, describe, expect, it, vi } from "vitest";
import { createSeedState, DEMO_STATE_VERSION } from "@/lib/data/seed";
import { DEMO_STORAGE_KEY, readPersistedState } from "@/lib/repositories/memory";

describe("demo repository migrations", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("adds the shelter demo to saved v2 data without discarding existing listings", () => {
    const legacy = createSeedState(new Date("2026-10-31T12:00:00+05:30"));
    legacy.version = "rescuerelay-demo-v2";
    legacy.users = legacy.users.filter((user) => user.id !== "user-ngo-asha");
    legacy.ngos = legacy.ngos.filter((ngo) => ngo.id !== "ngo-safe-paws");
    legacy.needs = legacy.needs.filter((needs) => needs.ngoId !== "ngo-safe-paws");
    legacy.donations[0].title = "Keep this saved listing";
    legacy.donations.forEach((donation) => {
      delete donation.animalShelterOnly;
    });

    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => (key === DEMO_STORAGE_KEY ? JSON.stringify(legacy) : null),
      },
    });

    const migrated = readPersistedState();

    expect(migrated?.version).toBe(DEMO_STATE_VERSION);
    expect(migrated?.donations[0].title).toBe("Keep this saved listing");
    expect(migrated?.users.some((user) => user.id === "user-ngo-asha")).toBe(true);
    expect(migrated?.ngos.find((ngo) => ngo.id === "ngo-safe-paws")?.recipientType).toBe("animal_shelter");
    expect(migrated?.donations[0].animalShelterOnly).toBe(false);
  });
});
