/**
 * @description Subscribes a plan-scoped `/plans*` route to its plan's lifecycle stream
 * (`PlanLifecycleNotificationsDocument`, topic `plan:<planId>:lifecycle`) over graphql-ws and
 * revalidates the route when a relevant event arrives, so the view stays in sync when status is
 * changed by openthrottle-mcp, a runner, a queue processor or another tab.
 *
 * Topic routing is server-side by `planId`; the event-name and task filter is client-side
 * (`shouldRevalidateForLifecycleEvent`), and bursts are coalesced by {@link useCoalescedRevalidate}.
 * The subscription is enabled only once a `planId` is present and is torn down on unmount.
 */
import { useSubscription } from '@openthrottle/react-router-graphql';
import * as React from 'react';

import { PlanLifecycleNotificationsDocument } from '~/__generated__/graphql';
import { PLAN_LIFECYCLE_REVALIDATE_DELAY_MS } from '~/routing/plans/data/data.plan-lifecycle-events';
import { useCoalescedRevalidate } from '~/routing/plans/hooks/useCoalescedRevalidate';
import { shouldRevalidateForLifecycleEvent } from '~/routing/plans/utils/plan-lifecycle-events';
import { getGraphqlWsClient } from '~/services/getGraphqlWsClient';

export interface UsePlanLifecycleRevalidationOptions {
  /** Event names that refresh this route (see `data.plan-lifecycle-events`). */
  readonly events: readonly string[];
  /** Scope task-level events to one task (the task detail route); `undefined` for the whole plan. */
  readonly taskId: string | undefined;
}

export function usePlanLifecycleRevalidation(
  planId: string,
  options: UsePlanLifecycleRevalidationOptions,
): void {
  const { events, taskId } = options;

  // Hooks
  const { requestRevalidate } = useCoalescedRevalidate({
    delayMs: PLAN_LIFECYCLE_REVALIDATE_DELAY_MS,
  });

  // Setup
  const notificationsClient = React.useMemo(() => getGraphqlWsClient(), []);

  // Handlers

  // Markup

  // Life Cycle
  useSubscription(
    notificationsClient,
    PlanLifecycleNotificationsDocument,
    { planId },
    {
      onData: (data) => {
        const isRelevant = shouldRevalidateForLifecycleEvent(
          data.planNotifications,
          { events, taskId },
        );

        if (isRelevant) requestRevalidate();
      },
    },
    Boolean(planId),
  );

  // 🔌 Short Circuit
}
