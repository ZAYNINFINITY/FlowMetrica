/** Interface preferences persist per browser; they never leave the device. */

const STORAGE_KEY = 'flowmetrica.preferences.v1';

export const DEFAULT_PREFERENCES = {
  reduceMotion: false,
  sidebarCollapsed: false,
  tourSeen: false,
};

export function loadPreferences() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object') return DEFAULT_PREFERENCES;
    return {
      reduceMotion: parsed.reduceMotion === true,
      sidebarCollapsed: parsed.sidebarCollapsed === true,
      tourSeen: parsed.tourSeen === true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Preferences are a convenience; the session keeps working without them.
  }
}
