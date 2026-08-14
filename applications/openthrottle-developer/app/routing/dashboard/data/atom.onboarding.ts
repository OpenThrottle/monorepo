import { APP_NAME } from '@openthrottle/react-router-utils';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import type { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage';

/**
 * Schema version stamped into the persisted blob. Bump whenever
 * {@link OnboardingState} changes shape so {@link normalizeOnboardingState} can
 * migrate old blobs forward instead of wiping the user's dismissal.
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Coerce a persisted record into a valid {@link OnboardingState}: a non-boolean
 * `dismissed` drops back to the default rather than corrupting the blob.
 */
const coerceOnboardingState = (
  record: Record<string, unknown>,
): OnboardingState => ({
  dismissed: typeof record.dismissed === 'boolean' ? record.dismissed : false,
  version: ONBOARDING_STATE_VERSION,
});

/**
 * @description Migration-aware coercion of unknown persisted JSON into a valid
 * {@link OnboardingState}. Reads `version`; the current version coerces its
 * fields, while a newer/unknown version — or malformed input — degrades to
 * {@link DEFAULT_ONBOARDING_STATE} rather than throwing. The `switch` is the
 * seam where a future reshape slots in as its own case.
 */
export function normalizeOnboardingState(raw: unknown): OnboardingState {
  if (!isRecord(raw)) {
    return DEFAULT_ONBOARDING_STATE;
  }

  const version = typeof raw.version === 'number' ? raw.version : 0;

  switch (version) {
    case ONBOARDING_STATE_VERSION:
      return coerceOnboardingState(raw);
    default:
      // Newer/unknown schema written by a build we can't understand, or a
      // legacy unversioned blob: don't guess — fall back to defaults.
      return DEFAULT_ONBOARDING_STATE;
  }
}

/**
 * SSR-guarded JSON storage that normalizes on read. On the server (no `window`)
 * it is a no-op store, so the atom hydrates to the default and the browser
 * re-reads localStorage on mount.
 */
const createOnboardingStorage = (): SyncStorage<OnboardingState> => {
  const jsonStorage = createJSONStorage<OnboardingState>(() => {
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
      return normalizeOnboardingState(raw);
    },
  };
};

/**
 * Global, localStorage-backed atom holding the Get Started checklist dismissal.
 * `getOnInit` hydrates synchronously from storage so the card reflects the saved
 * value on first client paint.
 */
export const onboardingStateAtom = atomWithStorage(
  ONBOARDING_STORAGE_KEY,
  DEFAULT_ONBOARDING_STATE,
  createOnboardingStorage(),
  { getOnInit: true },
);
