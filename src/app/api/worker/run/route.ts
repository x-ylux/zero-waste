import { NextResponse } from "next/server";
import { RecoveryWorker } from "@/lib/recovery/worker";

export async function POST() {
  try {
    const result = await RecoveryWorker.run();
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Worker execution failed." },
      { status: 500 }
    );
  }
}

