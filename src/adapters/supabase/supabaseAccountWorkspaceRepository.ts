import type {
  AccountUser,
  AccountWorkspace,
  MembershipRole,
  Organization,
  OrganizationMember,
  OrganizationMembership,
} from "../../application/accounts/domain";
import {
  emailEligibilityError,
  normalizeProfessionalEmail,
} from "../../application/auth/emailEligibility";
import type { WorkspacePage } from "../../application/workspaceNavigation";
import { getSupabaseClient, publicAuthCallbackUrl } from "./client";

type AccountMode = "signup" | "login";
type OAuthProvider = "google" | "azure";

interface ProfileRow {
  display_name: string | null;
  active_organization_id: string | null;
}

interface MembershipRow {
  organization_id: string;
  role: MembershipRole;
  organizations: { id: string; name: string } | Array<{ id: string; name: string }> | null;
}

interface MemberRpcRow {
  member_id: string;
  email: string;
  display_name: string | null;
  role: MembershipRole;
  status: "active" | "invited";
}

interface InvitationFunctionResult {
  error?: string;
}

interface EligibilityRpcRow {
  eligible: boolean;
  reason: string | null;
}

interface AuthenticationCompletionRpcRow {
  eligibility_status: string;
}

const workspaceRetryDelaysMs = [0, 500, 1_000] as const;

function isJwtClockSkewError(message: string): boolean {
  return /jwt\s+issued\s+(?:at|in\s+the)\s+future/i.test(message);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

function firstRpcRow<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function organizationFromRelation(value: MembershipRow["organizations"]): Organization | null {
  const organization = Array.isArray(value) ? value[0] : value;
  return organization ? { id: organization.id, name: organization.name } : null;
}

export class SupabaseAccountWorkspaceRepository {
  async requestOtp(
    emailValue: string,
    mode: AccountMode,
    destination: WorkspacePage,
  ): Promise<string> {
    const email = await this.requireEligibleEmail(emailValue);
    const { error } = await getSupabaseClient().auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: mode === "signup",
        emailRedirectTo: publicAuthCallbackUrl(destination),
      },
    });
    if (error) throw new Error(error.message);
    return email;
  }

  async verifyOtp(emailValue: string, token: string): Promise<AccountWorkspace> {
    const email = normalizeProfessionalEmail(emailValue);
    const cleanToken = token.replace(/\s/g, "");
    if (!/^\d{6}$/.test(cleanToken)) throw new Error("Enter the 6-digit code from your email.");
    const { error } = await getSupabaseClient().auth.verifyOtp({
      email,
      token: cleanToken,
      type: "email",
    });
    if (error) throw new Error(error.message);
    const workspace = await this.loadWorkspace();
    if (!workspace) throw new Error("Your authenticated workspace could not be loaded.");
    return workspace;
  }

  async signInWithProvider(provider: OAuthProvider, destination: WorkspacePage): Promise<void> {
    const { error } = await getSupabaseClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: publicAuthCallbackUrl(destination),
        ...(provider === "azure" ? { scopes: "email" } : {}),
      },
    });
    if (error) throw new Error(error.message);
  }

  async loadWorkspace(): Promise<AccountWorkspace | null> {
    const client = getSupabaseClient();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw new Error(sessionError.message);
    const user = sessionData.session?.user;
    if (!user?.email) return null;

    await this.completeAuthentication();

    let profile: ProfileRow | undefined;
    let rows: MembershipRow[] | undefined;
    for (const [attempt, retryDelay] of workspaceRetryDelaysMs.entries()) {
      if (retryDelay > 0) await wait(retryDelay);
      const [profileResponse, membershipResponse] = await Promise.all([
        client.from("profiles").select("display_name, active_organization_id").eq("id", user.id).single(),
        client
          .from("organization_memberships")
          .select("organization_id, role, organizations(id, name)")
          .eq("user_id", user.id),
      ]);
      const responseError = profileResponse.error ?? membershipResponse.error;
      if (responseError) {
        const retryAvailable = attempt < workspaceRetryDelaysMs.length - 1;
        if (retryAvailable && isJwtClockSkewError(responseError.message)) continue;
        throw new Error(responseError.message);
      }

      profile = profileResponse.data as ProfileRow;
      rows = membershipResponse.data as unknown as MembershipRow[];
      break;
    }
    if (!profile || !rows) throw new Error("Your authenticated workspace could not be loaded.");

    const organizations = rows
      .map((row) => organizationFromRelation(row.organizations))
      .filter((organization): organization is Organization => Boolean(organization));
    const memberships: OrganizationMembership[] = rows.map((row) => ({
      userId: user.id,
      organizationId: row.organization_id,
      role: row.role,
    }));
    const accountUser: AccountUser = {
      id: user.id,
      email: user.email,
      displayName: profile.display_name ?? user.email.split("@")[0] ?? user.email,
    };
    const activeOrganizationId = profile.active_organization_id ?? organizations[0]?.id;
    return {
      session: activeOrganizationId
        ? { user: accountUser, memberships, activeOrganizationId }
        : { user: accountUser, memberships },
      organizations,
    };
  }

  async signOut(): Promise<void> {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw new Error(error.message);
  }

  async createOrganization(nameValue: string): Promise<AccountWorkspace> {
    const name = nameValue.trim();
    if (!name) throw new Error("Enter an organization name.");
    const { error } = await getSupabaseClient().rpc("create_organization", { organization_name: name });
    if (error) throw new Error(error.message);
    const workspace = await this.loadWorkspace();
    if (!workspace) throw new Error("The organization workspace could not be loaded.");
    return workspace;
  }

  async switchOrganization(organizationId: string): Promise<AccountWorkspace> {
    const { error } = await getSupabaseClient().rpc("set_active_organization", {
      target_organization_id: organizationId,
    });
    if (error) throw new Error(error.message);
    const workspace = await this.loadWorkspace();
    if (!workspace) throw new Error("The organization workspace could not be loaded.");
    return workspace;
  }

  async listMembers(organizationId: string): Promise<OrganizationMember[]> {
    const { data, error } = await getSupabaseClient().rpc("list_organization_members", {
      target_organization_id: organizationId,
    });
    if (error) throw new Error(error.message);
    return ((data ?? []) as MemberRpcRow[]).map((row) => ({
      user: {
        id: row.member_id,
        email: row.email,
        displayName: row.display_name ?? row.email.split("@")[0] ?? row.email,
      },
      membership: {
        userId: row.member_id,
        organizationId,
        role: row.role,
      },
      status: row.status,
    }));
  }

  async addMember(
    organizationId: string,
    emailValue: string,
    role: MembershipRole,
  ): Promise<OrganizationMember> {
    const email = normalizeProfessionalEmail(emailValue);
    await this.invokeInvitationFunction({
      action: "invite",
      organizationId,
      email,
      role,
    });
    const members = await this.listMembers(organizationId);
    const member = members.find((candidate) => candidate.user.email === email);
    if (!member) throw new Error("The member invitation could not be loaded.");
    return member;
  }

  async resendInvitation(organizationId: string, memberId: string): Promise<void> {
    await this.invokeInvitationFunction({ action: "resend", organizationId, memberId });
  }

  async cancelInvitation(organizationId: string, memberId: string): Promise<void> {
    const { error } = await getSupabaseClient().rpc("remove_organization_member", {
      target_organization_id: organizationId,
      target_member_id: memberId,
      removal_type: "cancel",
    });
    if (error) throw new Error(error.message);
  }

  async revokeMember(organizationId: string, memberId: string): Promise<void> {
    const { error } = await getSupabaseClient().rpc("remove_organization_member", {
      target_organization_id: organizationId,
      target_member_id: memberId,
      removal_type: "revoke",
    });
    if (error) throw new Error(error.message);
  }

  async updateMemberRole(
    organizationId: string,
    memberId: string,
    role: Exclude<MembershipRole, "owner">,
  ): Promise<void> {
    const { error } = await getSupabaseClient().rpc("update_organization_member_role", {
      target_organization_id: organizationId,
      target_member_id: memberId,
      new_role: role,
    });
    if (error) throw new Error(error.message);
  }

  async transferOwnership(organizationId: string, newOwnerId: string): Promise<void> {
    const { error } = await getSupabaseClient().rpc("transfer_organization_ownership", {
      target_organization_id: organizationId,
      new_owner_id: newOwnerId,
    });
    if (error) throw new Error(error.message);
  }

  async deleteCurrentAccount(): Promise<void> {
    const client = getSupabaseClient();
    const { error } = await client.rpc("delete_current_account");
    if (error) throw new Error(error.message);
    await client.auth.signOut({ scope: "local" });
  }

  private async requireEligibleEmail(emailValue: string): Promise<string> {
    const email = normalizeProfessionalEmail(emailValue);
    const { data, error } = await getSupabaseClient().rpc("evaluate_email_eligibility", {
      input_email: email,
    });
    if (error) throw new Error(error.message);
    const result = firstRpcRow(data as EligibilityRpcRow | EligibilityRpcRow[] | null);
    if (!result) throw new Error("The email eligibility check could not be completed.");
    const policyError = emailEligibilityError(result.reason);
    if (!result.eligible && policyError) throw policyError;
    if (!result.eligible) throw new Error("This email address cannot be used with DemandLint.");
    return email;
  }

  private async completeAuthentication(): Promise<void> {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc("complete_authentication");
    if (error) throw new Error(error.message);
    const result = firstRpcRow(
      data as AuthenticationCompletionRpcRow | AuthenticationCompletionRpcRow[] | null,
    );
    if (!result) throw new Error("Your authenticated account could not be prepared.");
    const policyError = emailEligibilityError(result.eligibility_status);
    if (policyError) {
      await client.auth.signOut({ scope: "local" });
      throw policyError;
    }
    if (result.eligibility_status !== "allowed") {
      await client.auth.signOut({ scope: "local" });
      throw new Error("This email address cannot be used with DemandLint.");
    }
  }

  private async invokeInvitationFunction(body: Record<string, string>): Promise<void> {
    const { data, error } = await getSupabaseClient().functions.invoke<InvitationFunctionResult>(
      "organization-invitations",
      { body },
    );
    if (error) throw new Error(data?.error ?? error.message);
    if (data?.error) throw new Error(data.error);
  }
}

export const supabaseAccountWorkspaceRepository = new SupabaseAccountWorkspaceRepository();
