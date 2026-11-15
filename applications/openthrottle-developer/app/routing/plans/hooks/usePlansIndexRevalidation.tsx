import { useSubscription } from '@openthrottle/react-router-graphql';
import { useAtomValue } from 'jotai';
import * as React from 'react';

import { NotificationsDocument } from '~/__generated__/graphql';
import { userAtom } from '~/global/data/data.atom-user';
import {
  PLAN_LIFECYCLE_REVALIDATE_DELAY_MS,
  PLANS_INDEX_REVALIDATE_EVENTS,
} from '~/routing/plans/data/data.plan-lifecycle-events';
import { useCoalescedRevalidate } from '~/routing/plans/hooks/useCoalescedRevalidate';
import { shouldRevalidateForLifecycleEvent } from '~/routing/plans/utils/plan-lifecycle-events';
import { getGraphqlWsClient } from '~/services/getGraphqlWsClient';

/**
 * @description Keeps the `/plans` list live. There is no per-plan topic to join for a list, so
 * this listens on the authenticated `notifications` firehose (every lifecycle emit fans out to
 * it, on the one graphql-ws socket the app already holds), keeps only plan/task status events
 * and revalidates through {@link useCoalescedRevalidate}, so a runner flipping several tasks or
 * plans at once costs one loader run. Enabled only for a signed-in user, like the app's
 * notifications bridge.
 */
export const usePlansIndexRevalidation = (): void => {
  // Hooks
  const user = useAtomValue(userAtom);
  const { requestRevalidate } = useCoalescedRevalidate({
    delayMs: PLAN_LIFECYCLE_REVALIDATE_DELAY_MS,
  });

  // Setup
  const client = React.useMemo(() => getGraphqlWsClient(), []);
  const isEnabled = user !== null;

  // Handlers

  // Markup

  // Life Cycle
  useSubscription(
    client,
    NotificationsDocument,
    {},
    {
      onData: (data) => {
        const isRelevant = shouldRevalidateForLifecycleEvent(
          data.notifications,
          { events: PLANS_INDEX_REVALIDATE_EVENTS, taskId: undefined },
        );

        if (isRelevant) requestRevalidate();
      },
    },
    isEnabled,
  );

  // 🔌 Short Circuit
};
