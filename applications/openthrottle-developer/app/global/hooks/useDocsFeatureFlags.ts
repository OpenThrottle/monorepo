import * as React from 'react';
import {
  DOCS_FEATURE_FLAG_DEFAULTS,
  isDocsFeatureFlags,
} from '~/global/config/docs-feature-flags';
import { usePersistentSetting } from '~/global/hooks/usePersistentSetting';
import type {
  DocsFeatureFlagKey,
  DocsFeatureFlags,
} from '~/global/config/docs-feature-flags';

/** Namespaced persistent-setting key for the docs feature flags. */
const DOCS_FEATURE_FLAGS_SETTING = 'docs.featureFlags';

/** Flips a single docs feature flag, persisting the merged result. */
export type SetDocsFeatureFlag = (
  key: DocsFeatureFlagKey,
  enabled: boolean,
) => void;

/**
 * @public
 * @description SSR-safe, per-user docs feature flags. Returns a
 * `[flags, setFlag]` tuple. Flags resolve to {@link DOCS_FEATURE_FLAG_DEFAULTS}
 * on the server and the first client render, then reconcile to the persisted
 * per-user overrides (backed by the shared `usePersistentSetting` store, so
 * changes survive reloads and sync across tabs). `setFlag(key, enabled)` merges
 * one flag over the stored object and persists it.
 */
export const useDocsFeatureFlags = (): readonly [
  DocsFeatureFlags,
  SetDocsFeatureFlag,
] => {
  const [flags, setFlags] = usePersistentSetting<DocsFeatureFlags>(
    DOCS_FEATURE_FLAGS_SETTING,
    DOCS_FEATURE_FLAG_DEFAULTS,
    isDocsFeatureFlags,
  );

  const setFlag = React.useCallback<SetDocsFeatureFlag>(
    (key, enabled) => {
      setFlags((prev) => ({ ...prev, [key]: enabled }));
    },
    [setFlags],
  );

  return [flags, setFlag];
};
