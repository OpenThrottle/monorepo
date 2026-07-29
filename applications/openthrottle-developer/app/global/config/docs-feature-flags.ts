/**
 * @description Per-user, runtime-toggleable feature flags for the docs & FAQ
 * presentation upgrades (search, on-page TOC, prev/next, code-copy, rich
 * landing). Each upgrade has its own flag so the owner can A/B the pages with
 * and without it.
 *
 * These are distinct from the build-time env flags in
 * `@openthrottle/react-router-utils/src/config/features` (e.g.
 * `FEATURE_BETA_PREVIEW`): those are sourced from env at server start, whereas
 * these are read per-user from `localStorage` in the browser and resolve to the
 * defaults below on the server (SSR-safe). See
 * `docs/openthrottle/docs-faq-refresh.md`.
 */

/**
 * Default flag values. All default `true`: the refresh ships the improved
 * experience out of the box, and a `false` flag is the comparison baseline
 * (the previous thin behavior). Keys are alphabetized (code-style rule).
 */
export const DOCS_FEATURE_FLAG_DEFAULTS = {
  codeCopy: true,
  landing: true,
  prevNext: true,
  search: true,
  toc: true,
} as const;

/** A single docs feature-flag key. @public */
export type DocsFeatureFlagKey = keyof typeof DOCS_FEATURE_FLAG_DEFAULTS;

/** The full set of docs feature flags. @public */
export type DocsFeatureFlags = {
  readonly [K in DocsFeatureFlagKey]: boolean;
};

/** All flag keys, alphabetized. @public */
export const DOCS_FEATURE_FLAG_KEYS = [
  'codeCopy',
  'landing',
  'prevNext',
  'search',
  'toc',
] as const satisfies readonly DocsFeatureFlagKey[];

/**
 * Type guard for a persisted flags payload: an object carrying a boolean for
 * every known flag key. A malformed value (wrong type, missing key, non-boolean)
 * fails the guard so the caller falls back to {@link DOCS_FEATURE_FLAG_DEFAULTS}
 * rather than throwing. Unknown extra keys are ignored (forward-compatible).
 *
 * @public
 */
export const isDocsFeatureFlags = (
  value: unknown,
): value is DocsFeatureFlags => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record: Record<string, unknown> = { ...value };
  return DOCS_FEATURE_FLAG_KEYS.every(
    (key) => typeof record[key] === 'boolean',
  );
};
