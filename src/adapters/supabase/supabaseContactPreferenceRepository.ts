import type { ContactPreferenceRepository } from "../../application/ports/contactPreferenceRepository";
import { resolveContactPreferences } from "../../core/contactPoints";
import type { ContactPreferences } from "../../core/domain";
import { getSupabaseClient } from "./client";

export class SupabaseContactPreferenceRepository implements ContactPreferenceRepository {
  async load(scopeId?: string): Promise<ContactPreferences> {
    if (!scopeId) return resolveContactPreferences();
    const { data, error } = await getSupabaseClient()
      .from("contact_preferences")
      .select("preferences")
      .eq("organization_id", scopeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return resolveContactPreferences((data?.preferences ?? {}) as Partial<ContactPreferences>);
  }

  async save(preferences: ContactPreferences, scopeId?: string): Promise<void> {
    if (!scopeId) throw new Error("Choose an organization before saving preferences.");
    const { error } = await getSupabaseClient().from("contact_preferences").upsert({
      organization_id: scopeId,
      preferences: resolveContactPreferences(preferences),
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  }
}

export const supabaseContactPreferenceRepository = new SupabaseContactPreferenceRepository();
