import { APP_NAME } from '@openthrottle/react-router-utils';

/**
 * Schema version stamped into the persisted blob. Bump whenever
 * {@link OnboardingState} changes shape so `normalizeOnboardingState` (in
 * `~/routing/dashboard/utils/onboarding-state`) can migrate old blobs forward
 * instead of wiping the user's dismissal.
 */
export const ONBOARDING_STATE_VERSION = 1 as const;

/**
 * localStorage key for the dashboard "Get Started" checklist dismissal. Derived
 * from `APP_NAME` at RUNTIME (via window.env / process.env) so the key is
 * namespaced per consuming app automatically. Client-only (per-browser) by
 * design — auto-hide-on-complete is server-derived, so only the manual "dismiss
 * before finishing" preference is browser-local.
 */
export const ONBOARDING_STORAGE_KEY = `${APP_NAME}:dashboard:onboarding`;

/**
 * Persisted state for the Get Started checklist. `version` stamps the schema for
 * forward migration; `dismissed` is the user's manual hide preference.
 */
export interface OnboardingState {
  readonly dismissed: boolean;
  readonly version: typeof ONBOARDING_STATE_VERSION;
}

/** Default = not dismissed. */
export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  dismissed: false,
  version: ONBOARDING_STATE_VERSION,
};
