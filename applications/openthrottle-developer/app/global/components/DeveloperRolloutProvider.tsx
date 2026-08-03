/**
 * @description App-side wiring for `@openthrottle/react-router-rollout`: supplies
 * the developer catalog, APP_NAME applicationKey, anonymous id, and the
 * GraphQL `evaluateFeatureFlags` adapter (codegen stays app-side).
 */

import * as React from 'react';
import { APP_NAME } from '@openthrottle/react-router-utils';
import { RolloutProvider } from '@openthrottle/react-router-rollout';
import { developerRolloutFlags } from '~/global/data/data.rollout-flags';
import { fetchRolloutEvaluations } from '~/global/utils/fetch-rollout-evaluations';
import { getOrCreateRolloutAnonymousId } from '~/global/utils/rollout-anonymous-id';

export interface DeveloperRolloutProviderProps {
  readonly children: React.ReactNode;
  /** Auth subject id when logged in; triggers re-hydration on login/logout. */
  readonly identityKey?: string | null;
}

export const DeveloperRolloutProvider = (
  props: DeveloperRolloutProviderProps,
): React.ReactElement => {
  const { children, identityKey = null } = props;

  // Hooks
  const [anonymousId, setAnonymousId] = React.useState<string | null>(() =>
    typeof window === 'undefined' ? null : getOrCreateRolloutAnonymousId(),
  );

  // Setup
  const cacheIdentityKey = identityKey ?? anonymousId;

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (anonymousId != null) {
      return;
    }

    setAnonymousId(getOrCreateRolloutAnonymousId());
  }, [anonymousId]);

  // 🔌 Short Circuit

  return (
    <RolloutProvider
      anonymousId={anonymousId}
      applicationKey={APP_NAME}
      cache={{ storage: 'sessionStorage' }}
      fetchEvaluations={fetchRolloutEvaluations}
      flags={developerRolloutFlags}
      identityKey={cacheIdentityKey}
    >
      {children}
    </RolloutProvider>
  );
};
