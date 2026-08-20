export type UserId = string;
export type OrganizationId = string;

export type MembershipRole = "owner" | "admin" | "member";

export interface AccountUser {
  id: UserId;
  email: string;
  displayName?: string;
}

export interface Organization {
  id: OrganizationId;
  name: string;
}

export interface OrganizationMembership {
  userId: UserId;
  organizationId: OrganizationId;
  role: MembershipRole;
}

export interface AuthSession {
  user: AccountUser;
  memberships: OrganizationMembership[];
  activeOrganizationId?: OrganizationId;
}

export interface AccountWorkspace {
  session: AuthSession;
  organizations: Organization[];
}

export interface CreateAccountInput {
  email: string;
}

export interface CreateOrganizationInput {
  name: string;
}

export interface OrganizationMember {
  user: AccountUser;
  membership: OrganizationMembership;
}
