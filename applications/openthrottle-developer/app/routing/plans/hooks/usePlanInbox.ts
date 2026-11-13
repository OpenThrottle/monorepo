import { useSubscription } from '@openthrottle/react-router-graphql';
import * as React from 'react';

import type {
  PlanInboxMessageFragment,
  PlanMessageChangedSubscription,
  PlanTaskRowFragment,
} from '~/__generated__/graphql';
import { PlanMessageChangedDocument } from '~/__generated__/graphql';
import { getSteerPendingTaskIds } from '~/routing/plans/utils/getSteerPendingTaskIds';
import { getGraphqlWsClient } from '~/services/getGraphqlWsClient';

export interface UsePlanInboxOptions {
  readonly planId: string;
  /** `undefined` until the deferred loader snapshot resolves — not "empty". */
  readonly seedMessages: readonly PlanInboxMessageFragment[] | undefined;
  /** The plan's tasks, used to flag in-flight tasks with a waiting steer. */
  readonly tasks: readonly PlanTaskRowFragment[];
}

export interface UsePlanInboxResult {
  /** STEER and QUEUE messages, oldest first. */
  readonly messages: readonly PlanInboxMessageFragment[];
  /** IN_PROGRESS tasks a still-waiting STEER message is about. */
  readonly steerPendingTaskIds: ReadonlySet<string>;
}

/**
 * @description The plan's live-run inbox: the loader snapshot seeds it and
 * `planMessageChanged` keeps it current, so a message flips from Waiting to
 * Delivered on screen the moment a run claims it. Unlike the output stream a
 * message MUTATES (posted → delivered or withdrawn), so both sources upsert by
 * id and the newer `updatedAt` wins — a late snapshot can never roll a delivered
 * row back to pending. Lives at route level so a tab switch does not drop the
 * subscription.
 */
export const usePlanInbox = (
  options: UsePlanInboxOptions,
): UsePlanInboxResult => {
  const { planId, seedMessages, tasks } = options;

  // Hooks
  const [byId, setById] = React.useState<
    ReadonlyMap<string, PlanInboxMessageFragment>
  >(
    () => new Map((seedMessages ?? []).map((message) => [message.id, message])),
  );

  // Setup
  const client = React.useMemo(() => getGraphqlWsClient(), []);

  // Handlers
  const upsert = React.useCallback(
    (incoming: readonly PlanInboxMessageFragment[]): void => {
      setById((previous) => {
        const newer = incoming.filter((message) => {
          const current = previous.get(message.id);

          return (
            current === undefined ||
            new Date(message.updatedAt).getTime() >
              new Date(current.updatedAt).getTime()
          );
        });

        // 🚨 Unchanged state must keep its identity, or the re-seed effect
        // below turns into a render loop.
        if (newer.length === 0) return previous;

        const next = new Map(previous);
        for (const message of newer) next.set(message.id, message);

        return next;
      });
    },
    [],
  );

  const onData = (data: PlanMessageChangedSubscription): void => {
    upsert([data.planMessageChanged]);
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (seedMessages !== undefined) upsert(seedMessages);
  }, [seedMessages, upsert]);

  useSubscription(
    client,
    PlanMessageChangedDocument,
    { planId },
    { onData },
    Boolean(planId),
  );

  // 🔌 Short Circuit

  const messages = React.useMemo(
    () =>
      Array.from(byId.values())
        .filter((message) => message.kind !== 'FEEDBACK')
        .sort(
          (left, right) =>
            new Date(left.createdAt).getTime() -
            new Date(right.createdAt).getTime(),
        ),
    [byId],
  );

  const steerPendingTaskIds = React.useMemo(
    () => getSteerPendingTaskIds(messages, tasks),
    [messages, tasks],
  );

  return { messages, steerPendingTaskIds };
};
