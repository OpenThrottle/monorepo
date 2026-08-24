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
 * @description Default label for the {@link GlobalFeatureOnboardingTrigger}
 * button that re-opens the onboarding pitch once a list is populated. Callers can
 * override per feature via the trigger's `label` prop.
 */
export const GLOBAL_FEATURE_ONBOARDING_TRIGGER_LABEL = `How it works`;

/**
 * @public
 * Default copy for {@link GlobalPopover}: shared Actions column header text and
 * fallback labels for the confirm dialog when a submit action omits them.
 */
export const GLOBAL_POPOVER_COPY = {
  actionsHeader: `Actions`,
  cancelLabel: `Cancel`,
  confirmLabel: `Confirm`,
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
