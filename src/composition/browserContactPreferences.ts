import { localContactPreferenceRepository } from "../adapters/browser/localContactPreferenceRepository";
import type { ContactPreferences } from "../core/domain";

export function loadBrowserContactPreferences(): ContactPreferences {
  return localContactPreferenceRepository.load();
}

export function saveBrowserContactPreferences(preferences: ContactPreferences): void {
  localContactPreferenceRepository.save(preferences);
}
