/**
 * @description Client flag catalog for openthrottle-developer. Keys, kinds, and
 * defaults are the type SSOT for `useRolloutFlag` / `useIsRolloutEnabled`, which
 * take this same object (identity-checked against the provider's `flags`); the
 * server remains SSOT for runtime evaluation via `evaluateFeatureFlags`.
 */

import { defineRolloutFlags } from '@openthrottle/react-router-rollout';

/**
 * Developer-app rollout catalog. `applicationKey` is `APP_NAME` today.
 *
 * @public
 */
export const developerRolloutFlags = defineRolloutFlags({
  beta: { defaultValue: false, kind: 'boolean' },
  'example-string-one': { defaultValue: 'default-value', kind: 'string' },
  navigation: { defaultValue: false, kind: 'boolean' },
  timeline: { defaultValue: false, kind: 'boolean' },
});

/** Catalog type of {@link developerRolloutFlags}. */
export type DeveloperRolloutFlags = typeof developerRolloutFlags;
