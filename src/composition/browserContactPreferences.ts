import { localContactPreferenceRepository } from "../adapters/browser/localContactPreferenceRepository";
import { isSupabaseConfigured } from "../adapters/supabase/client";
import { supabaseContactPreferenceRepository } from "../adapters/supabase/supabaseContactPreferenceRepository";
import type { ContactPreferences } from "../core/domain";

export function loadBrowserContactPreferences(scopeId?: string): Promise<ContactPreferences> {
  return isSupabaseConfigured()
    ? supabaseContactPreferenceRepository.load(scopeId)
    : localContactPreferenceRepository.load(scopeId);
}

export function saveBrowserContactPreferences(
  preferences: ContactPreferences,
  scopeId?: string,
): Promise<void> {
  return isSupabaseConfigured()
    ? supabaseContactPreferenceRepository.save(preferences, scopeId)
    : localContactPreferenceRepository.save(preferences, scopeId);
}
