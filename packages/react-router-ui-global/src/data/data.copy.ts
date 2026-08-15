/**
 * @description Single-sourced section headings the presentational
 * `GlobalFeatureOnboarding` layout renders around each feature's supplied copy
 * object. Feature-specific wording lives in that feature's own `data/data.copy.ts`,
 * not here.
 */

export const GLOBAL_FEATURE_ONBOARDING_SECTION_COPY = {
  internalUsage: `How we use it internally`,
  steps: `Quick start`,
  useCases: `What you could use it for`,
  whatItIs: `What it is`,
} as const;

/**
 * @public
 * Default copy for {@link GlobalToolbarSearch}. Consumers override the
 * placeholder and aria-label per surface; the submit button falls back to this
 * label when no override is supplied.
 */
export const GLOBAL_TOOLBAR_SEARCH_COPY = {
  buttonLabel: `Search`,
} as const;
