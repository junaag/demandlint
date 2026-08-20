import type { ContactPreferences } from "../../core/domain";

export interface ContactPreferenceRepository {
  load(): ContactPreferences;
  save(preferences: ContactPreferences): void;
}
