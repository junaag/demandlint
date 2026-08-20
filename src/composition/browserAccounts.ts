import { localAccountWorkspaceRepository } from "../adapters/browser/localAccountWorkspaceRepository";
import type {
  AccountWorkspace,
  CreateAccountInput,
  MembershipRole,
  OrganizationMember,
} from "../application/accounts/domain";

export function loadBrowserAccountWorkspace(): AccountWorkspace | null {
  return localAccountWorkspaceRepository.loadWorkspace();
}

export function createBrowserAccount(input: CreateAccountInput): AccountWorkspace {
  return localAccountWorkspaceRepository.createAccount(input);
}

export function signInBrowserAccount(email: string): AccountWorkspace {
  return localAccountWorkspaceRepository.signIn(email);
}

export function signOutBrowserAccount(): void {
  localAccountWorkspaceRepository.signOut();
}

export function createBrowserOrganization(name: string): AccountWorkspace {
  return localAccountWorkspaceRepository.createOrganization(name);
}

export function switchBrowserOrganization(organizationId: string): AccountWorkspace {
  return localAccountWorkspaceRepository.switchOrganization(organizationId);
}

export function listBrowserOrganizationMembers(organizationId: string): OrganizationMember[] {
  return localAccountWorkspaceRepository.listMembers(organizationId);
}

export function addBrowserOrganizationMember(
  organizationId: string,
  email: string,
  role: MembershipRole,
): OrganizationMember {
  return localAccountWorkspaceRepository.addMember(organizationId, email, role);
}
