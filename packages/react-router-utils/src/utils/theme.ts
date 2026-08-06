/**
 * Framework-agnostic, SSR-safe theme logic shared across OpenThrottle React
 * Router apps. This module MUST stay free of jotai and shadcn (react-router-utils
 * is zero-dep and sits below both). Anything that needs those — the jotai config
 * atom, storage, and the shadcn `isThemeId` palette check — stays in the app.
 */

/** Persisted color mode. `'system'` follows the OS `prefers-color-scheme`. */
export type ThemeMode = 'dark' | 'light' | 'system';

/** Concrete color mode after `'system'` has been resolved. */
export type ResolvedThemeMode = 'dark' | 'light';

/**
 * @description Type guard for a persisted {@link ThemeMode} (accepts `'system'`).
 */
export const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'dark' || value === 'light' || value === 'system';

/**
 * @description Resolve a stored {@link ThemeMode} to a concrete light/dark value.
 * Pure: the caller supplies the `window.matchMedia('(prefers-color-scheme: dark)')`
 * result as `prefersDark`, keeping this SSR-safe. `'system'` follows `prefersDark`;
 * explicit `'light'`/`'dark'` are returned as-is.
 */
export const resolveThemeMode = (
  theme: ThemeMode,
  prefersDark: boolean,
): ResolvedThemeMode => {
  if (theme === 'system') {
    return prefersDark ? 'dark' : 'light';
  }

  return theme;
};

/**
 * Default brand token from the app stylesheet (`:root { --brand }`).
 * When the stored brand is undefined, the stylesheet default applies.
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
 * `:root` custom properties set from the stored brand color in the root layout.
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

/**
 * @description Build the inline pre-hydration script that reads the persisted
 * appearance config from localStorage and applies the palette (`data-theme`) and
 * the light/dark class on `<html>` before first paint, preventing a
 * flash-of-wrong-theme. Includes a `system` branch that resolves the OS
 * preference via `matchMedia('(prefers-color-scheme: dark)')`, so `'system'`
 * mode is applied correctly on the very first paint (the server cannot know the
 * OS preference).
 *
 * When no config is stored the script still resolves the DEFAULT `'system'`
 * theme (matching `DEFAULT_APPEARANCE_CONFIG`) rather than bailing out. This is
 * load-bearing for hydration: `useResolvedThemeMode` eagerly resolves `system`
 * to the OS preference on the first client render, so a fresh OS-dark user's
 * React tree renders `<html class="dark">`. If the script left the DOM classless
 * (the old `if(!raw)return`), React's render would not match the DOM and
 * `hydrateRoot(document, …)` would report a recoverable hydration error (React
 * #418). Applying the default here keeps the pre-paint DOM in sync with that
 * eager render — no #418, and still no flash.
 *
 * @param storageKey localStorage key holding the serialized appearance config.
 */
export const buildThemePrehydrationScript = (storageKey: string): string =>
  `(function(){try{var d=document.documentElement;var raw=window.localStorage.getItem(${JSON.stringify(
    storageKey,
  )});var c=raw?JSON.parse(raw):null;if(c&&typeof c.themeId==='string'){d.setAttribute('data-theme',c.themeId);}var t=(c&&c.theme)||'system';var dark=t==='dark'||(t==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(dark){d.classList.add('dark');}else{d.classList.remove('dark');}}catch(e){}})();`;
