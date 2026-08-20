import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
}));

vi.mock("../../src/adapters/supabase/client", () => ({
  getSupabaseClient: mocks.getSupabaseClient,
  publicApplicationUrl: () => "https://demandlint.com/",
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
      from,
    });

    const workspacePromise = new SupabaseAccountWorkspaceRepository().loadWorkspace();
    await vi.advanceTimersByTimeAsync(500);
    const workspace = await workspacePromise;

    expect(profileAttempt).toBe(2);
    expect(workspace?.session.activeOrganizationId).toBe("org-1");
    expect(workspace?.session.memberships[0]?.role).toBe("member");
  });
});
