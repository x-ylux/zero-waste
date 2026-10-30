import { DonationStatusType } from "@/lib/types/domain";

export interface DonationListingState {
  status: DonationStatusType;
  pickupWindowEnd: Date | string;
}

export function isActiveDonationListing(
  donation: DonationListingState,
  now: Date = new Date()
): boolean {
  return (
    (donation.status === "OPEN" || donation.status === "PARTIALLY_ALLOCATED") &&
    new Date(donation.pickupWindowEnd).getTime() > now.getTime()
  );
}
