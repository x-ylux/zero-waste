import { RecoveryWorker } from "../src/lib/recovery/worker";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("⚙️  Running RescuePlate Background Recovery Worker...");
  try {
    const result = await RecoveryWorker.run();
    console.log("-----------------------------------------");
    for (const log of result.logs) {
      console.log(log);
    }
    console.log("-----------------------------------------");
    console.log(`Summary:`);
    console.log(`- Expired offers processed: ${result.processedExpiredOffersCount}`);
    console.log(`- Assignments recovered with backup: ${result.recoveredAssignmentsCount}`);
    console.log(`- Incidents escalated to Admin: ${result.escalatedToAdminCount}`);
    console.log("✅ Worker run completed successfully.");
  } catch (error) {
    console.error("❌ Worker encountered an error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

