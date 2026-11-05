import { APP_NAME, type ThemeMode } from '@openthrottle/react-router-utils';

/** localStorage key for persisted appearance preferences. */
export const CONFIG_STORAGE_KEY = `${APP_NAME}:settings:appearance`;

/**
 * Motion preference. `'system'` defers to `prefers-reduced-motion`; `'always'`
 * suppresses decorative animation regardless of the OS setting.
 */
export const REDUCED_MOTION_MODES = {
  always: 'always',
  system: 'system',
} as const;

export type ReducedMotionMode =
  (typeof REDUCED_MOTION_MODES)[keyof typeof REDUCED_MOTION_MODES];

export interface ConfigObject {
  brand: string | undefined;
  reducedMotion: ReducedMotionMode;
  theme: ThemeMode;
  /** Selected palette id (`<html data-theme>`); undefined = base theme.css palette. */
  themeId: string | undefined;
}

/**
 * Default = `system` (product-confirmed): the app follows the OS color scheme
 * out of the box. Existing users keep their persisted value via
 * `normalizeAppearanceConfig` in `~/global/utils/appearance-config`.
 */
export const DEFAULT_APPEARANCE_CONFIG: ConfigObject = {
  brand: undefined,
  reducedMotion: REDUCED_MOTION_MODES.system,
  theme: 'system',
  themeId: undefined,
};
