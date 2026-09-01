import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
}));

vi.mock("../../src/adapters/supabase/client", () => ({
  getSupabaseClient: mocks.getSupabaseClient,
  publicAuthCallbackUrl: (destination: string) => `https://demandlint.com/auth?next=%2F${destination}`,
}));

import { SupabaseAccountWorkspaceRepository } from "../../src/adapters/supabase/supabaseAccountWorkspaceRepository";

describe("SupabaseAccountWorkspaceRepository", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("retries workspace loading when a freshly issued JWT is briefly ahead of the API clock", async () => {
    vi.useFakeTimers();
    let profileAttempt = 0;
    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => {
                profileAttempt += 1;
                return profileAttempt === 1
                  ? { data: null, error: { message: "JWT issued at future" } }
                  : { data: { display_name: "Invited member", active_organization_id: "org-1" }, error: null };
              },
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: async () => ({
            data: [{ organization_id: "org-1", role: "member", organizations: { id: "org-1", name: "Workspace" } }],
            error: null,
          }),
        }),
      };
    });
    mocks.getSupabaseClient.mockReturnValue({
      auth: {
        getSession: async () => ({
          data: { session: { user: { id: "user-1", email: "member@example.com" } } },
          error: null,
        }),
      },
      rpc: async (name: string) => name === "complete_authentication"
        ? { data: [{ eligibility_status: "allowed" }], error: null }
        : { data: null, error: null },
      from,
    });

    const workspacePromise = new SupabaseAccountWorkspaceRepository().loadWorkspace();
    await vi.advanceTimersByTimeAsync(500);
    const workspace = await workspacePromise;

    expect(profileAttempt).toBe(2);
    expect(workspace?.session.activeOrganizationId).toBe("org-1");
    expect(workspace?.session.memberships[0]?.role).toBe("member");
  });

  it("checks hosted email eligibility before sending an OTP and preserves the destination", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({
      data: [{ eligible: true, reason: null }],
      error: null,
    });
    mocks.getSupabaseClient.mockReturnValue({ auth: { signInWithOtp }, rpc });

    await new SupabaseAccountWorkspaceRepository().requestOtp(
      " Staff@Company.com ",
      "signup",
      "settings",
    );

    expect(rpc).toHaveBeenCalledWith("evaluate_email_eligibility", {
      input_email: "staff@company.com",
    });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "staff@company.com",
      options: {
        shouldCreateUser: true,
        emailRedirectTo: "https://demandlint.com/auth?next=%2Fsettings",
      },
    });
  });

  it("does not start hosted authentication for a rejected email", async () => {
    const signInWithOtp = vi.fn();
    mocks.getSupabaseClient.mockReturnValue({
      auth: { signInWithOtp },
      rpc: vi.fn().mockResolvedValue({
        data: [{ eligible: false, reason: "consumer" }],
        error: null,
      }),
    });

    await expect(new SupabaseAccountWorkspaceRepository().requestOtp(
      "person@gmail.com",
      "signup",
      "import",
    )).rejects.toThrow("DemandLint is available for business accounts only");
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it.each(["google", "azure"] as const)(
    "provisions and loads a workspace after a new %s authentication",
    async (provider) => {
      const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });
      const rpc = vi.fn().mockResolvedValue({
        data: [{ eligibility_status: "allowed", workspace_created: true }],
        error: null,
      });
      mocks.getSupabaseClient.mockReturnValue({
        auth: {
          signInWithOAuth,
          getSession: async () => ({
            data: { session: { user: { id: `user-${provider}`, email: `new@${provider}.company` } } },
            error: null,
          }),
        },
        rpc,
        from: (table: string) => table === "profiles"
          ? {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { display_name: "New User", active_organization_id: `org-${provider}` },
                  error: null,
                }),
              }),
            }),
          }
          : {
            select: () => ({
              eq: async () => ({
                data: [{
                  organization_id: `org-${provider}`,
                  role: "owner",
                  organizations: { id: `org-${provider}`, name: "Company workspace" },
                }],
                error: null,
              }),
            }),
          },
      });
      const repository = new SupabaseAccountWorkspaceRepository();

      await repository.signInWithProvider(provider, "templates");
      const workspace = await repository.loadWorkspace();

      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider,
        options: {
          redirectTo: "https://demandlint.com/auth?next=%2Ftemplates",
          ...(provider === "azure" ? { scopes: "openid email" } : {}),
        },
      });
      expect(rpc).toHaveBeenCalledWith("complete_authentication");
      expect(workspace?.organizations).toHaveLength(1);
      expect(workspace?.session.memberships[0]?.role).toBe("owner");
    },
  );

  it("runs idempotent completion on repeated logins without changing the existing workspace", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ eligibility_status: "allowed", workspace_created: false }],
      error: null,
    });
    const from = (table: string) => table === "profiles"
      ? {
        select: () => ({ eq: () => ({ single: async () => ({
          data: { display_name: "Existing", active_organization_id: "org-existing" },
          error: null,
        }) }) }),
      }
      : {
        select: () => ({ eq: async () => ({
          data: [{
            organization_id: "org-existing",
            role: "owner",
            organizations: { id: "org-existing", name: "Existing workspace" },
          }],
          error: null,
        }) }),
      };
    mocks.getSupabaseClient.mockReturnValue({
      auth: { getSession: async () => ({
        data: { session: { user: { id: "existing-user", email: "owner@company.com" } } },
        error: null,
      }) },
      rpc,
      from,
    });
    const repository = new SupabaseAccountWorkspaceRepository();

    const first = await repository.loadWorkspace();
    const second = await repository.loadWorkspace();

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(first?.organizations).toEqual(second?.organizations);
    expect(second?.organizations).toHaveLength(1);
    expect(second?.session.memberships).toHaveLength(1);
  });
  it("requests the email scope required by Microsoft OAuth", async () => {
    const signInWithOAuth = vi.fn(async () => ({ error: null }));
    mocks.getSupabaseClient.mockReturnValue({
      auth: { signInWithOAuth },
    });

    await new SupabaseAccountWorkspaceRepository().signInWithProvider("azure", "import");

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "azure",
      options: {
        redirectTo: "https://demandlint.com/auth?next=%2Fimport",
        scopes: "openid email",
      },
    });
  });
});
