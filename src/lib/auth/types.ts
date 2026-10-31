import type {
  DonorOrg,
  NeedsRequest,
  NgoProfile,
  User,
  VolunteerProfile,
} from "@/lib/domain/types";

export interface AuthenticatedAccount {
  user: User;
  donor?: DonorOrg;
  ngo?: NgoProfile;
  needs?: NeedsRequest;
  volunteer?: VolunteerProfile;
}
