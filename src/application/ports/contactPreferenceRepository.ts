import type { ContactPreferences } from "../../core/domain";

export interface ContactPreferenceRepository {
  load(scopeId?: string): Promise<ContactPreferences>;
  save(preferences: ContactPreferences, scopeId?: string): Promise<void>;
}
