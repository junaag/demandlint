import { localContactPreferenceRepository } from "../adapters/browser/localContactPreferenceRepository";
import type { ContactPreferences } from "../core/domain";

export function loadBrowserContactPreferences(scopeId?: string): ContactPreferences {
  return localContactPreferenceRepository.load(scopeId);
}

export function saveBrowserContactPreferences(
  preferences: ContactPreferences,
  scopeId?: string,
): void {
  localContactPreferenceRepository.save(preferences, scopeId);
}
