import { describe, expect, it, vi } from "vitest";
import {
  LOCAL_PREPROD_IDENTITY,
  LocalPreprodAuthProvider,
} from "../../src/adapters/supabase/localPreprodAuthProvider";

describe("LocalPreprodAuthProvider", () => {
  it("opens the deterministic local test identity without OTP authentication", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ data: {}, error: null });
    const provider = new LocalPreprodAuthProvider({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signInWithPassword,
      },
    } as never);

    await provider.ensureAuthenticated();

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: LOCAL_PREPROD_IDENTITY.email,
      password: LOCAL_PREPROD_IDENTITY.password,
    });
  });

  it("reuses an existing local test session", async () => {
    const signInWithPassword = vi.fn();
    const provider = new LocalPreprodAuthProvider({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { email: LOCAL_PREPROD_IDENTITY.email } } },
          error: null,
        }),
        signInWithPassword,
      },
    } as never);

    await provider.ensureAuthenticated();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
