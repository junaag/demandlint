import type {
  CreateOrganizationInput,
  Organization,
  OrganizationMember,
  OrganizationMembership,
  UserId,
} from "../accounts/domain";

export interface OrganizationRepository {
  listForUser(userId: UserId): Promise<Organization[]>;
  listMemberships(userId: UserId): Promise<OrganizationMembership[]>;
  getById(id: string): Promise<Organization | null>;
  create?(userId: UserId, input: CreateOrganizationInput): Promise<Organization>;
  listMembers?(organizationId: string): Promise<OrganizationMember[]>;
  addMember?(organizationId: string, email: string, role: OrganizationMembership["role"]): Promise<OrganizationMember>;
}
