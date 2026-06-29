/**
 * @description Subscribes the plan detail route to the per-plan lifecycle
 * notification stream (`PlanLifecycleNotificationsDocument`) over graphql-ws and
 * revalidates the route whenever a plan/task status-change event arrives, so the
 * view stays in sync when status is updated via openthrottle-mcp or the API.
 *
 * Topic routing is server-side by `planId` (no client filtering); the
 * subscription is enabled only once a `planId` is present and is torn down on
 * unmount by {@link useSubscription}. Replaces the retired Socket.IO
 * revalidation. Extracted verbatim from `routes/plans.$planId._index.tsx`.
 */
import * as React from 'react';
import { useRevalidator } from 'react-router';
import { useSubscription } from '@openthrottle/react-router-graphql';
import { PlanLifecycleNotificationsDocument } from '~/__generated__/graphql';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

export function usePlanLifecycleRevalidation(planId: string): void {
  // Hooks
  const notificationsClient = React.useMemo(() => getGraphqlWsClient(), []);
  const revalidator = useRevalidator();

  // Life Cycle
  useSubscription(
    notificationsClient,
    PlanLifecycleNotificationsDocument,
    { planId },
    { onData: () => revalidator.revalidate() },
    Boolean(planId),
  );
}
