import type { ThemeTokenName } from '../theme-contract';

/**
 * @description Tailwind color-utility prefixes safelisted for every theme token,
 * so a class typed into CMS content (never seen by Tailwind's source scan)
 * still generates. Chosen in OT plan `fa064e46` task 1 by gzip cost; gradients
 * (`from`/`via`/`to`), `shadow-` color and opacity modifiers were left out.
 */
export const THEME_SAFELIST_PREFIXES: readonly string[] = [
  'accent',
  'bg',
  'border',
  'caret',
  'decoration',
  'divide',
  'fill',
  'outline',
  'placeholder',
  'ring',
  'stroke',
  'text',
];

/** @description The prefixes that also get a `hover:` variant. */
export const THEME_SAFELIST_HOVER_PREFIXES: readonly string[] = [
  'bg',
  'border',
  'text',
];

/**
 * @description Tokens whose Tailwind color name differs from the CSS custom
 * property: `theme.css` maps `--sidebar-background` to `--color-sidebar`.
 * Every other token's color name is the token name itself.
 */
export const THEME_TOKEN_COLOR_ALIASES: Readonly<
  Partial<Record<ThemeTokenName, string>>
> = {
  'sidebar-background': 'sidebar',
};

/** @description Header stamped into the generated `src/theme-safelist.css`. */
export const THEME_SAFELIST_BANNER = `GENERATED — DO NOT EDIT. Regenerate with \`pnpm nx run @openthrottle/react-router-shadcn:test -- -u buildThemeSafelist\` (src/themes/buildThemeSafelist.ts).`; // prettier-ignore
