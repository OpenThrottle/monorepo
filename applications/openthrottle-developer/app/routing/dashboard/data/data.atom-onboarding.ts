import { atomWithStorage } from 'jotai/utils';

import {
  DEFAULT_ONBOARDING_STATE,
  ONBOARDING_STORAGE_KEY,
} from '~/routing/dashboard/data/data.onboarding-state';
import { createOnboardingStorage } from '~/routing/dashboard/utils/onboarding-state';

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
