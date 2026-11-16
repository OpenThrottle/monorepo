/**
 * @description The org profile's stats card ("By the numbers"), ported from
 * OpenThrottle/.github `profile/assets/build.mjs` so its numbers come from
 * the generator instead of being typed by hand. The palette mirrors the app's
 * brand theme (docs/marketing/format.json → brand).
 * @public
 */
export const STATS_GRAPHIC_PALETTES = {
  dark: {
    bg: '#0A0D0F',
    border: '#20262D',
    card: '#13171B',
    fg: '#F7F9FA',
    grid: '#161B20',
    muted: '#7C8892',
    red: '#FF0000',
  },
  light: {
    bg: '#FFFFFF',
    border: '#D0D7DE',
    card: '#F6F8FA',
    fg: '#0A0D0F',
    grid: '#EEF1F4',
    muted: '#57606A',
    red: '#E00000',
  },
} as const;

/** @public */
export const STATS_GRAPHIC_FONTS = {
  mono: `'JetBrains Mono', SFMono-Regular, Menlo, Consolas, monospace`,
  sans: `Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif`,
} as const;

/** @public */
export const STATS_GRAPHIC_COPY = {
  agentClis: 'agent CLIs',
  agentsLabel: 'BRING YOUR OWN AGENT',
  altAgents: 'agent CLIs',
  altApplications: 'applications',
  altMergedPullRequests: 'pull requests merged',
  altPackages: 'packages',
  applications: 'applications',
  mergedPullRequests: 'PRs merged',
  packages: 'packages',
} as const;

/**
 * @description Geometry of the card, in SVG user units. `chipGap` separates
 * chips; a chip is `chipTextX` + text + `chipPaddingRight` wide.
 * @public
 */
export const STATS_GRAPHIC_LAYOUT = {
  chipFontSize: 20,
  chipGap: 10,
  chipHeight: 46,
  chipPaddingRight: 22,
  chipTextX: 33,
  chipY: 210,
  height: 290,
  labelFontSize: 16,
  labelGapAfter: 24,
  labelLetterSpacing: 2.5,
  margin: 40,
  monoAdvance: 0.6,
  width: 1280,
} as const;

/**
 * @description Approximate advance widths (in em) for semibold sans text, per
 * character class. GitHub renders the SVG as an image with whatever system
 * font matches, so this only has to be close enough to size the chips; the
 * old flat 0.6em estimate let wide names (OpenCode) overrun their pill.
 * @public
 */
export const STATS_GRAPHIC_ADVANCE = {
  defaultLower: 0.58,
  defaultUpper: 0.68,
  narrow: { chars: "iljI.,:;|!' ", em: 0.28 },
  roundUpper: { chars: 'OCGQD', em: 0.74 },
  semiNarrow: { chars: 'frt', em: 0.38 },
  wide: { chars: 'mwMW', em: 0.86 },
} as const;
