import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "./client";

export const LOCAL_PREPROD_IDENTITY = {
  id: "00000000-0000-4000-8000-000000000312",
  email: "test@demandlint.local",
  password: "DemandLint-Local-Only-0312!",
} as const;

type LocalPreprodAuthClient = Pick<SupabaseClient, "auth">;

export class LocalPreprodAuthProvider {
  constructor(private readonly configuredClient?: LocalPreprodAuthClient) {}

  async ensureAuthenticated(): Promise<void> {
    const client = this.configuredClient ?? getSupabaseClient();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw new Error(`Local pre-production session check failed: ${sessionError.message}`);
    if (sessionData.session?.user.email === LOCAL_PREPROD_IDENTITY.email) return;

    if (sessionData.session) {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw new Error(`Local pre-production session cleanup failed: ${error.message}`);
    }

    const { error } = await client.auth.signInWithPassword({
      email: LOCAL_PREPROD_IDENTITY.email,
      password: LOCAL_PREPROD_IDENTITY.password,
    });
    if (error) {
      throw new Error(
        `Local pre-production authentication failed. Run npm run preprod:reset. ${error.message}`,
      );
    }
  }
}

export const localPreprodAuthProvider = new LocalPreprodAuthProvider();
