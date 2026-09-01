import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { authPageHref, type WorkspacePage } from "../../application/workspaceNavigation";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

let client: SupabaseClient | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Hosted authentication is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  client ??= createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
  return client;
}

export function publicAuthCallbackUrl(destination: WorkspacePage): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${authPageHref(window.location.pathname, { next: destination })}`;
}
