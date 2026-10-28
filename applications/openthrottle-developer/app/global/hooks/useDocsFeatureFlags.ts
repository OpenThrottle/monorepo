import * as React from 'react';

import type { DocsFeatureFlags } from '~/global/config/docs-feature-flags';
import {
  DOCS_FEATURE_FLAG_DEFAULTS,
  DOCS_FEATURE_FLAGS_SETTING,
  isDocsFeatureFlags,
} from '~/global/config/docs-feature-flags';
import { usePersistentSetting } from '~/global/hooks/usePersistentSetting';
import type { SetDocsFeatureFlag } from '~/global/types';

export type UseDocsFeatureFlagsResult = readonly [
  DocsFeatureFlags,
  SetDocsFeatureFlag,
];

/**
 * @public
 * @description SSR-safe, per-user docs feature flags. Returns a
 * `[flags, setFlag]` tuple. Flags resolve to {@link DOCS_FEATURE_FLAG_DEFAULTS}
 * on the server and the first client render, then reconcile to the persisted
 * per-user overrides (backed by the shared `usePersistentSetting` store, so
 * changes survive reloads and sync across tabs). `setFlag(key, enabled)` merges
 * one flag over the stored object and persists it.
 */
export const useDocsFeatureFlags = (): UseDocsFeatureFlagsResult => {
  // Hooks
  const [flags, setFlags] = usePersistentSetting<DocsFeatureFlags>(
    DOCS_FEATURE_FLAGS_SETTING,
    DOCS_FEATURE_FLAG_DEFAULTS,
    isDocsFeatureFlags,
  );

  // Setup

  // Handlers
  const setFlag = React.useCallback<SetDocsFeatureFlag>(
    (key, enabled) => {
      setFlags((prev) => ({ ...prev, [key]: enabled }));
    },
    [setFlags],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return [flags, setFlag];
};
