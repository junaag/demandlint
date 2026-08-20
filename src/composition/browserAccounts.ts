import { localAccountWorkspaceRepository } from "../adapters/browser/localAccountWorkspaceRepository";
import { isSupabaseConfigured } from "../adapters/supabase/client";
import { supabaseAccountWorkspaceRepository } from "../adapters/supabase/supabaseAccountWorkspaceRepository";
import type {
  AccountWorkspace,
  MembershipRole,
  OrganizationMember,
} from "../application/accounts/domain";

export type BrowserAccountMode = "signup" | "login";
export type BrowserOAuthProvider = "google" | "azure";

export interface AccountAccessResult {
  verificationRequired: boolean;
  workspace?: AccountWorkspace;
}

export function isHostedAccountBackendConfigured(): boolean {
  return isSupabaseConfigured();
}

export function isBrowserOAuthProviderEnabled(provider: BrowserOAuthProvider): boolean {
  if (!isSupabaseConfigured()) return false;
  if (provider === "google") return import.meta.env.VITE_AUTH_GOOGLE_ENABLED === "true";
  return import.meta.env.VITE_AUTH_MICROSOFT_ENABLED === "true";
}

export async function loadBrowserAccountWorkspace(): Promise<AccountWorkspace | null> {
  return isSupabaseConfigured()
    ? supabaseAccountWorkspaceRepository.loadWorkspace()
    : localAccountWorkspaceRepository.loadWorkspace();
}

export async function requestBrowserAccountAccess(
  email: string,
  mode: BrowserAccountMode,
): Promise<AccountAccessResult> {
  if (isSupabaseConfigured()) {
    await supabaseAccountWorkspaceRepository.requestOtp(email, mode);
    return { verificationRequired: true };
  }
  const workspace = mode === "signup"
    ? localAccountWorkspaceRepository.createAccount({ email })
    : localAccountWorkspaceRepository.signIn(email);
  return { verificationRequired: false, workspace };
}

export async function verifyBrowserAccountOtp(email: string, token: string): Promise<AccountWorkspace> {
  if (!isSupabaseConfigured()) throw new Error("Email verification requires hosted authentication.");
  return supabaseAccountWorkspaceRepository.verifyOtp(email, token);
}

export async function signInBrowserAccountWithProvider(provider: BrowserOAuthProvider): Promise<void> {
  if (!isBrowserOAuthProviderEnabled(provider)) throw new Error("This sign-in provider is not enabled yet.");
  await supabaseAccountWorkspaceRepository.signInWithProvider(provider);
}

export async function signOutBrowserAccount(): Promise<void> {
  if (isSupabaseConfigured()) await supabaseAccountWorkspaceRepository.signOut();
  else localAccountWorkspaceRepository.signOut();
}

export async function createBrowserOrganization(name: string): Promise<AccountWorkspace> {
  return isSupabaseConfigured()
    ? supabaseAccountWorkspaceRepository.createOrganization(name)
    : localAccountWorkspaceRepository.createOrganization(name);
}

export async function switchBrowserOrganization(organizationId: string): Promise<AccountWorkspace> {
  return isSupabaseConfigured()
    ? supabaseAccountWorkspaceRepository.switchOrganization(organizationId)
    : localAccountWorkspaceRepository.switchOrganization(organizationId);
}

export async function listBrowserOrganizationMembers(
  organizationId: string,
): Promise<OrganizationMember[]> {
  return isSupabaseConfigured()
    ? supabaseAccountWorkspaceRepository.listMembers(organizationId)
    : localAccountWorkspaceRepository.listMembers(organizationId);
}

export async function addBrowserOrganizationMember(
  organizationId: string,
  email: string,
  role: MembershipRole,
): Promise<OrganizationMember> {
  return isSupabaseConfigured()
    ? supabaseAccountWorkspaceRepository.addMember(organizationId, email, role)
    : localAccountWorkspaceRepository.addMember(organizationId, email, role);
}

export async function resendBrowserOrganizationInvitation(
  organizationId: string,
  memberId: string,
): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabaseAccountWorkspaceRepository.resendInvitation(organizationId, memberId);
    return;
  }
  localAccountWorkspaceRepository.resendInvitation(organizationId, memberId);
}

export async function cancelBrowserOrganizationInvitation(
  organizationId: string,
  memberId: string,
): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabaseAccountWorkspaceRepository.cancelInvitation(organizationId, memberId);
    return;
  }
  localAccountWorkspaceRepository.cancelInvitation(organizationId, memberId);
}

export async function revokeBrowserOrganizationMember(
  organizationId: string,
  memberId: string,
): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabaseAccountWorkspaceRepository.revokeMember(organizationId, memberId);
    return;
  }
  localAccountWorkspaceRepository.revokeMember(organizationId, memberId);
}

export async function updateBrowserOrganizationMemberRole(
  organizationId: string,
  memberId: string,
  role: Exclude<MembershipRole, "owner">,
): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabaseAccountWorkspaceRepository.updateMemberRole(organizationId, memberId, role);
    return;
  }
  localAccountWorkspaceRepository.updateMemberRole(organizationId, memberId, role);
}

export async function transferBrowserOrganizationOwnership(
  organizationId: string,
  newOwnerId: string,
): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabaseAccountWorkspaceRepository.transferOwnership(organizationId, newOwnerId);
    return;
  }
  localAccountWorkspaceRepository.transferOwnership(organizationId, newOwnerId);
}

export async function deleteBrowserAccount(): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Account deletion requires hosted authentication.");
  await supabaseAccountWorkspaceRepository.deleteCurrentAccount();
}
