/**
 * @description Form intents for Settings → Preferences. Each section submits its
 * own intent so the route action patches only that preference, and the UI can
 * tell which section a result belongs to.
 */
export const PREFERENCES_INTENTS = {
  clearDefaultAgent: 'clearDefaultAgent',
  saveDefaultAgent: 'saveDefaultAgent',
  saveDefaultEditor: 'saveDefaultEditor',
} as const;

export type PreferencesIntent =
  (typeof PREFERENCES_INTENTS)[keyof typeof PREFERENCES_INTENTS];

/** @description What the preferences action returns for any intent. */
export type PreferencesActionResult =
  | { readonly error: string; readonly intent: PreferencesIntent | null }
  | { readonly intent: PreferencesIntent; readonly ok: true };

/**
 * @description Radix `Select` reserves the empty string, so the "System default"
 * option needs a real value. The form posts `''` for it, which clears.
 */
export const SYSTEM_DEFAULT_EDITOR_VALUE = '__system__';
