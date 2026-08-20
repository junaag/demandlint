import type {
  AccountUser,
  AccountWorkspace,
  MembershipRole,
  Organization,
  OrganizationMember,
  OrganizationMembership,
} from "../../application/accounts/domain";
import { getSupabaseClient, publicApplicationUrl } from "./client";

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

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid work email address.");
  }
  return email;
}

function organizationFromRelation(value: MembershipRow["organizations"]): Organization | null {
  const organization = Array.isArray(value) ? value[0] : value;
  return organization ? { id: organization.id, name: organization.name } : null;
}

export class SupabaseAccountWorkspaceRepository {
  async requestOtp(emailValue: string, mode: AccountMode): Promise<string> {
    const email = normalizeEmail(emailValue);
    const { error } = await getSupabaseClient().auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: mode === "signup",
        emailRedirectTo: publicApplicationUrl(),
      },
    });
    if (error) throw new Error(error.message);
    return email;
  }

  async verifyOtp(emailValue: string, token: string): Promise<AccountWorkspace> {
    const email = normalizeEmail(emailValue);
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

  async signInWithProvider(provider: OAuthProvider): Promise<void> {
    const { error } = await getSupabaseClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: publicApplicationUrl() },
    });
    if (error) throw new Error(error.message);
  }

  async loadWorkspace(): Promise<AccountWorkspace | null> {
    const client = getSupabaseClient();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw new Error(sessionError.message);
    const user = sessionData.session?.user;
    if (!user?.email) return null;

    const [profileResponse, membershipResponse] = await Promise.all([
      client.from("profiles").select("display_name, active_organization_id").eq("id", user.id).single(),
      client
        .from("organization_memberships")
        .select("organization_id, role, organizations(id, name)")
        .eq("user_id", user.id),
    ]);
    if (profileResponse.error) throw new Error(profileResponse.error.message);
    if (membershipResponse.error) throw new Error(membershipResponse.error.message);

    const profile = profileResponse.data as ProfileRow;
    const rows = membershipResponse.data as unknown as MembershipRow[];
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
    const email = normalizeEmail(emailValue);
    const { error } = await getSupabaseClient().rpc("invite_organization_member", {
      target_organization_id: organizationId,
      member_email: email,
      member_role: role,
    });
    if (error) throw new Error(error.message);
    const members = await this.listMembers(organizationId);
    const member = members.find((candidate) => candidate.user.email === email);
    if (!member) throw new Error("The member invitation could not be loaded.");
    return member;
  }

  async deleteCurrentAccount(): Promise<void> {
    const client = getSupabaseClient();
    const { error } = await client.rpc("delete_current_account");
    if (error) throw new Error(error.message);
    await client.auth.signOut({ scope: "local" });
  }
}

export const supabaseAccountWorkspaceRepository = new SupabaseAccountWorkspaceRepository();
