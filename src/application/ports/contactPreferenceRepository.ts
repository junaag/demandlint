import type { ContactPreferences } from "../../core/domain";

export interface ContactPreferenceRepository {
  load(scopeId?: string): ContactPreferences;
  save(preferences: ContactPreferences, scopeId?: string): void;
}
