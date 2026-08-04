/**
 * @description Low-risk demo consumer of the rollout SDK on Settings → Rollout.
 * Gated by `beta` so anon visits still render the page with catalog defaults when
 * evaluation is empty or fails.
 */

import * as React from 'react';
import {
  useIsRolloutEnabled,
  useRollout,
} from '@openthrottle/react-router-rollout';
import type { DeveloperRolloutFlags } from '~/global/data/data.rollout-flags';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';

export interface RolloutSdkHydrationStatusProps {}

export const RolloutSdkHydrationStatus = (
  _props: RolloutSdkHydrationStatusProps,
): React.ReactElement | null => {
  // Hooks
  const showDemo = useIsRolloutEnabled<DeveloperRolloutFlags>('beta');
  const { applicationKey, hydration } = useRollout<DeveloperRolloutFlags>();

  // Setup
  const statusLabel =
    hydration.status === 'error'
      ? ROLLOUT_COPY.sdkHydrationError
      : hydration.status === 'ready'
        ? ROLLOUT_COPY.sdkHydrationReady
        : hydration.status === 'loading'
          ? ROLLOUT_COPY.sdkHydrationLoading
          : ROLLOUT_COPY.sdkHydrationIdle;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!showDemo) {
    return null;
  }

  return (
    <p
      className="text-muted-foreground text-xs"
      data-application-key={applicationKey}
      data-hydration-status={hydration.status}
      data-testid="RolloutSdkHydrationStatus"
    >
      {ROLLOUT_COPY.sdkHydrationPrefix} {statusLabel}
      {hydration.status === 'error' ? (
        <span className="sr-only">{hydration.error.message}</span>
      ) : null}
    </p>
  );
};
