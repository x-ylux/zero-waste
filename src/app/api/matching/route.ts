import { createSeedState } from "@/lib/data/seed";
import { matchDonationToNgos } from "@/lib/domain/matching";
import { z } from "zod";
import { NextResponse } from "next/server";

const bodySchema = z.object({
  donationId: z.string(),
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const state = createSeedState();
  const donation = state.donations.find((item) => item.id === parsed.data.donationId);
  if (!donation) {
    return NextResponse.json({ error: "Donation not found in seed snapshot." }, { status: 404 });
  }
  const matches = matchDonationToNgos(donation, state.ngos, state.needs);
  return NextResponse.json({
    donationId: donation.id,
    matches,
    note: "Evaluated against the generated seed snapshot. Interactive demo matching uses the localStorage repository.",
  });
}
