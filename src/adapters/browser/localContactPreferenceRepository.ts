import type { ContactPreferenceRepository } from "../../application/ports/contactPreferenceRepository";
import { resolveContactPreferences } from "../../core/contactPoints";
import type { ContactPreferences } from "../../core/domain";

const STORAGE_KEY = "demandlint.contact-preferences.v1";

export class LocalContactPreferenceRepository implements ContactPreferenceRepository {
  load(): ContactPreferences {
    if (typeof localStorage === "undefined") return resolveContactPreferences();

    try {
      const value = localStorage.getItem(STORAGE_KEY);
      if (!value) return resolveContactPreferences();
      return resolveContactPreferences(JSON.parse(value) as Partial<ContactPreferences>);
    } catch {
      return resolveContactPreferences();
    }
  }

  save(preferences: ContactPreferences): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resolveContactPreferences(preferences)));
    } catch {
      // Storage may be unavailable in private/restricted browser contexts. The
      // in-memory React state still keeps the preference for the current session.
    }
  }
}

export const localContactPreferenceRepository = new LocalContactPreferenceRepository();
