import { APP_NAME } from '@openthrottle/react-router-utils';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import type { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage';

/** localStorage key for persisted appearance preferences. */
export const CONFIG_STORAGE_KEY = `${APP_NAME}:settings:appearance`;

/**
 * Default brand token from `app/styles.css` (`:root { --brand }`).
 * When {@link ConfigObject.brand} is undefined, the stylesheet default applies.
 */
export const DEFAULT_BRAND_HSL = 'hsl(208 100% 50%)';

/** Hex for {@link DEFAULT_BRAND_HSL}; used by `<input type="color">` when brand is unset. */
export const DEFAULT_BRAND_HEX = '#0088ff';

const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const clampByte = (value: number): number =>
  Math.min(255, Math.max(0, Math.round(value)));

const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[clampByte(r), clampByte(g), clampByte(b)]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;

const expandShortHex = (hex: string): string => {
  if (hex.length !== 4) {
    return hex;
  }
  const [, r, g, b] = hex;
  return `#${r}${r}${g}${g}${b}${b}`;
};

const parseHslComponents = (
  color: string,
): { readonly h: number; readonly l: number; readonly s: number } | null => {
  const match =
    /^hsla?\(\s*([+-]?\d*\.?\d+)\s*(?:[, ]\s*|\s+)([+-]?\d*\.?\d+)%\s*(?:[, ]\s*|\s+)([+-]?\d*\.?\d+)%/i.exec(
      color.trim(),
    );
  if (!match) {
    return null;
  }
  return {
    h: Number(match[1]),
    l: Number(match[3]),
    s: Number(match[2]),
  };
};

const hslComponentsToRgb = (h: number, s: number, l: number) => {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const chroma = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const intermediate = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = lNorm - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (h < 60) {
    red = chroma;
    green = intermediate;
  } else if (h < 120) {
    red = intermediate;
    green = chroma;
  } else if (h < 180) {
    green = chroma;
    blue = intermediate;
  } else if (h < 240) {
    green = intermediate;
    blue = chroma;
  } else if (h < 300) {
    red = intermediate;
    blue = chroma;
  } else {
    red = chroma;
    blue = intermediate;
  }

  return {
    b: (blue + match) * 255,
    g: (green + match) * 255,
    r: (red + match) * 255,
  };
};

/**
 * @description Parse a CSS color string to `#rrggbb`, or null when unsupported.
 */
export const cssColorToHex = (color: string): string | null => {
  const trimmed = color.trim();
  if (HEX_COLOR_PATTERN.test(trimmed)) {
    return expandShortHex(trimmed.toLowerCase());
  }

  const hsl = parseHslComponents(trimmed);
  if (!hsl) {
    return null;
  }

  const { b, g, r } = hslComponentsToRgb(hsl.h, hsl.s, hsl.l);
  return rgbToHex(r, g, b);
};

/**
 * @description Value for `<input type="color">`; falls back to {@link DEFAULT_BRAND_HEX}.
 */
export const getBrandColorInputValue = (brand: string | undefined): string => {
  if (!brand) {
    return DEFAULT_BRAND_HEX;
  }

  return cssColorToHex(brand) ?? DEFAULT_BRAND_HEX;
};

/**
 * `:root` custom properties set from {@link ConfigObject.brand} in the root layout.
 * These are the source tokens referenced by `@theme` in
 * `packages/react-router-shadcn/src/theme.css` (e.g. `--color-ring: var(--ring)`).
 *
 * Omitted (left to theme.css / light–dark defaults):
 * - `--primary`, `--background`, neutrals, chart-2…chart-5
 * - `--accent`, `--tw-ring-color` (already `var(--brand)` in theme.css)
 */
export const APPEARANCE_BRAND_OVERRIDE_KEYS = [
  '--brand',
  '--chart-1',
  '--ring',
  '--sidebar-primary',
  '--sidebar-ring',
] as const;

export type AppearanceBrandOverrideKey =
  (typeof APPEARANCE_BRAND_OVERRIDE_KEYS)[number];

/**
 * Tailwind `@theme` color tokens that resolve through {@link APPEARANCE_BRAND_OVERRIDE_KEYS}
 * (for documentation and tests; not injected directly on `:root`).
 */
export const APPEARANCE_THEME_COLOR_TOKEN_KEYS = [
  '--color-accent',
  '--color-chart-1',
  '--color-ring',
  '--color-sidebar-primary',
  '--color-sidebar-ring',
] as const;

export type AppearanceThemeColorTokenKey =
  (typeof APPEARANCE_THEME_COLOR_TOKEN_KEYS)[number];

/** All appearance-related CSS names (source vars + derived `@theme` tokens). */
export const APPEARANCE_CSS_VARIABLE_KEYS = [
  ...APPEARANCE_BRAND_OVERRIDE_KEYS,
  ...APPEARANCE_THEME_COLOR_TOKEN_KEYS,
  '--accent',
  '--tw-ring-color',
] as const;

export type AppearanceCssVariableKey =
  (typeof APPEARANCE_CSS_VARIABLE_KEYS)[number];

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
