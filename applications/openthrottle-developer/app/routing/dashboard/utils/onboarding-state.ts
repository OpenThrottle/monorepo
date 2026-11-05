import { isRecord } from '@openthrottle/nodejs-utils';
import { createJSONStorage } from 'jotai/utils';
import type { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage';

import type { OnboardingState } from '~/routing/dashboard/data/data.onboarding-state';
import {
  DEFAULT_ONBOARDING_STATE,
  ONBOARDING_STATE_VERSION,
} from '~/routing/dashboard/data/data.onboarding-state';

/**
 * Coerce a persisted record into a valid {@link OnboardingState}: a non-boolean
 * `dismissed` drops back to the default rather than corrupting the blob.
 */
const coerceOnboardingState = (
  record: Record<string, unknown>,
): OnboardingState => {
  return {
    dismissed: typeof record.dismissed === 'boolean' ? record.dismissed : false,
    version: ONBOARDING_STATE_VERSION,
  };
};

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
export const createOnboardingStorage = (): SyncStorage<OnboardingState> => {
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
