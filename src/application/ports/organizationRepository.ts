import type {
  Organization,
  OrganizationMembership,
  UserId,
} from "../accounts/domain";

export interface OrganizationRepository {
  listForUser(userId: UserId): Promise<Organization[]>;
  listMemberships(userId: UserId): Promise<OrganizationMembership[]>;
  getById(id: string): Promise<Organization | null>;
}
