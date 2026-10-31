import { Prisma, PrismaClient } from "@prisma/client";
import { IMPACT_CONFIG } from "../src/lib/config/impact";
import { createSeedState } from "../src/lib/data/seed";

const prisma = new PrismaClient();

async function main() {
  const state = createSeedState() as unknown as Prisma.InputJsonValue;
  await prisma.appSnapshot.upsert({
    where: { id: "default" },
    update: { state },
    create: { id: "default", state },
  });
  await prisma.impactConfigRow.upsert({
    where: { id: "default" },
    update: {
      mealEquivalentServings: IMPACT_CONFIG.mealEquivalents.servings,
      mealEquivalentKg: IMPACT_CONFIG.mealEquivalents.kg,
      mealEquivalentPackets: IMPACT_CONFIG.mealEquivalents.packets,
      mealEquivalentBoxes: IMPACT_CONFIG.mealEquivalents.boxes,
      kgCo2ePerMealEquivalent: IMPACT_CONFIG.kgCo2ePerMealEquivalent,
      notes: IMPACT_CONFIG.sources,
    },
    create: {
      id: "default",
      mealEquivalentServings: IMPACT_CONFIG.mealEquivalents.servings,
      mealEquivalentKg: IMPACT_CONFIG.mealEquivalents.kg,
      mealEquivalentPackets: IMPACT_CONFIG.mealEquivalents.packets,
      mealEquivalentBoxes: IMPACT_CONFIG.mealEquivalents.boxes,
      kgCo2ePerMealEquivalent: IMPACT_CONFIG.kgCo2ePerMealEquivalent,
      notes: IMPACT_CONFIG.sources,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
