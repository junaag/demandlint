import type { ContactPreferenceRepository } from "../../application/ports/contactPreferenceRepository";
import { resolveContactPreferences } from "../../core/contactPoints";
import type { ContactPreferences } from "../../core/domain";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const LEGACY_STORAGE_KEY = "demandlint.contact-preferences.v1";
const STORAGE_KEY_PREFIX = "demandlint.contact-preferences.v2";

function storageKey(scopeId?: string): string {
  return scopeId ? `${STORAGE_KEY_PREFIX}:${scopeId}` : LEGACY_STORAGE_KEY;
}

function browserStorage(): StorageLike | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

export class LocalContactPreferenceRepository implements ContactPreferenceRepository {
  constructor(private readonly storage: StorageLike | undefined = browserStorage()) {}

  load(scopeId?: string): ContactPreferences {
    if (!this.storage) return resolveContactPreferences();

    try {
      const value = this.storage.getItem(storageKey(scopeId))
        ?? (scopeId ? this.storage.getItem(LEGACY_STORAGE_KEY) : null);
      if (!value) return resolveContactPreferences();
      return resolveContactPreferences(JSON.parse(value) as Partial<ContactPreferences>);
    } catch {
      return resolveContactPreferences();
    }
  }

  save(preferences: ContactPreferences, scopeId?: string): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(
        storageKey(scopeId),
        JSON.stringify(resolveContactPreferences(preferences)),
      );
    } catch {
      // Storage may be unavailable in private/restricted browser contexts. The
      // in-memory React state still keeps the preference for the current session.
    }
  }
}

export const localContactPreferenceRepository = new LocalContactPreferenceRepository();
