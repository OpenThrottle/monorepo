import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import type { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage';

/** localStorage key for persisted appearance preferences. */
export const CONFIG_STORAGE_KEY = 'openthrottle-developer-appearance';

/**
 * Default brand token from `app/styles.css` (`:root { --brand }`).
 * When {@link ConfigObject.brand} is undefined, the stylesheet default applies.
 */
export const DEFAULT_BRAND_HSL = 'hsl(208 100% 50%)';

/** CSS custom properties overridden from stored brand color in the root layout. */
export const APPEARANCE_CSS_VARIABLE_KEYS = [
  '--brand',
  '--accent',
  '--color-ring',
  '--color-sidebar-ring',
  '--tw-ring-color',
] as const;

export type AppearanceCssVariableKey =
  (typeof APPEARANCE_CSS_VARIABLE_KEYS)[number];

/**
 * Subset of {@link APPEARANCE_CSS_VARIABLE_KEYS} applied on `:root` when the user
 * sets a brand color. Omits `--accent` and `--tw-ring-color` (already `var(--brand)` in theme.css).
 */
export const APPEARANCE_BRAND_OVERRIDE_KEYS = [
  '--brand',
  '--color-ring',
  '--color-sidebar-ring',
] as const satisfies readonly AppearanceCssVariableKey[];

/**
 * @description Build `:root` declarations for a stored brand color (empty when unset).
 */
export const buildAppearanceRootCssBlock = (
  brand: string | undefined,
): string => {
  if (!brand) {
    return '';
  }

  return APPEARANCE_BRAND_OVERRIDE_KEYS.map((key) => `${key}: ${brand};`).join(
    '\n              ',
  );
};

export type ThemeMode = 'light' | 'dark';

export interface ConfigObject {
  brand: string | undefined;
  theme: ThemeMode;
}

export const DEFAULT_APPEARANCE_CONFIG: ConfigObject = {
  brand: undefined,
  theme: 'light',
};

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark';

/**
 * @description Coerce unknown persisted JSON into a valid {@link ConfigObject}.
 * Migrates legacy `accentColor` to `brand`.
 */
export const normalizeAppearanceConfig = (value: unknown): ConfigObject => {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_APPEARANCE_CONFIG;
  }

  const record = value as Record<string, unknown>;
  const theme = isThemeMode(record.theme)
    ? record.theme
    : DEFAULT_APPEARANCE_CONFIG.theme;

  let brand: string | undefined;
  if (typeof record.brand === 'string') {
    brand = record.brand;
  } else if (typeof record.accentColor === 'string') {
    brand = record.accentColor;
  } else {
    brand = undefined;
  }

  return { brand, theme };
};

const createAppearanceConfigStorage = (): SyncStorage<ConfigObject> => {
  const jsonStorage = createJSONStorage<ConfigObject>(() => {
    if (typeof window === 'undefined') {
      return {
        getItem: () => null,
        removeItem: () => {},
        setItem: () => {},
        subscribe: () => () => {},
      };
    }
    return localStorage;
  });

  return {
    ...jsonStorage,
    getItem: (key, initialValue) => {
      const raw = jsonStorage.getItem(key, initialValue);
      return normalizeAppearanceConfig(raw);
    },
  };
};

export const configAtom = atomWithStorage(
  CONFIG_STORAGE_KEY,
  DEFAULT_APPEARANCE_CONFIG,
  createAppearanceConfigStorage(),
  { getOnInit: true },
);
