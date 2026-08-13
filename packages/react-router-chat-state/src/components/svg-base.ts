/**
 * @description Shared props/attrs for the composer rail's provider brand
 * glyphs. Each icon draws with `currentColor` (inheriting the rail's text color
 * + theme) and is `aria-hidden` — the rail button owns the accessible label.
 * Purely presentational and SSR-safe; no model/discovery data.
 */

/** Props shared by every inline provider glyph. */
export interface ProviderIconProps {
  readonly className?: string;
}

/** Base SVG attributes: 1em box, 24-unit viewBox, hidden from a11y tree. */
export const BASE_SVG_PROPS = {
  'aria-hidden': true,
  focusable: false,
  height: '1em',
  viewBox: '0 0 24 24',
  width: '1em',
  xmlns: 'http://www.w3.org/2000/svg',
} as const;
