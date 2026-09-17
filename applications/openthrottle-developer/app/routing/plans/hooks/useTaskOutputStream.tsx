/**
 * @description Live task-scoped output stream for the task detail view. Mirrors
 * {@link usePlanOutputStream} but scoped to a single task: it seeds from the
 * loader's already-task-filtered chunks (the server filters by both planId and
 * taskId), merges live `planOutputChunkAdded` deltas, and dedupes by chunk id.
 * The subscription is plan-scoped and selects `taskId`, so incoming deltas are
 * still filtered client-side to this task before being merged in — only the
 * fetch-time filter moved server-side. On task navigation the accumulated map
 * resets so one task's chunks never leak into another; on same-task
 * revalidation the fresh snapshot is merged (so a live delta not yet in the
 * snapshot survives). SSR-safe: with no ws client it returns the seed.
 */
import type {
  PlanOutputChunkAddedSubscription,
  TaskOutputStreamChunksQuery,
} from '@openthrottle/openthrottle-developer-codegen';
import { useSubscription } from '@openthrottle/react-router-graphql';
import * as React from 'react';

import { PlanOutputChunkAddedDocument } from '~/__generated__/graphql';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

type Chunk = TaskOutputStreamChunksQuery['planOutputStreamChunks'][number];

/** Order by createdAt, then id, so renders are stable regardless of arrival order. */
function compareChunks(a: Chunk, b: Chunk): number {
  const at = String(a.createdAt);
  const bt = String(b.createdAt);

  if (at !== bt) return at < bt ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;

  return 0;
}

export function useTaskOutputStream(
  planId: string,
  taskId: string,
  seedChunks: Chunk[],
): Chunk[] {
  // Hooks
  const [byId, setById] = React.useState<ReadonlyMap<string, Chunk>>(
    () => new Map(seedChunks.map((chunk) => [chunk.id, chunk])),
  );
  const seededTaskId = React.useRef(taskId);

  // Setup
  const client = React.useMemo(() => getGraphqlWsClient(), []);

  // Handlers
  const onData = (data: PlanOutputChunkAddedSubscription): void => {
    const chunk = data.planOutputChunkAdded;
    if (chunk.taskId !== taskId) return;

    setById((previous) => {
      if (previous.has(chunk.id)) return previous;

      const next = new Map(previous);
      next.set(chunk.id, chunk);

      return next;
    });
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    // Reset when the task changes (so one task's chunks never leak into another),
    // otherwise merge the fresh snapshot so a live delta not yet in it survives.
    setById((previous) => {
      const base =
        seededTaskId.current === taskId ? previous : new Map<string, Chunk>();
      seededTaskId.current = taskId;

      const next = new Map(base);
      for (const chunk of seedChunks) {
        next.set(chunk.id, chunk);
      }

      return next;
    });
  }, [seedChunks, taskId]);

  useSubscription(
    client,
    PlanOutputChunkAddedDocument,
    { planId },
    { onData },
    Boolean(planId),
  );

  // 🔌 Short Circuit

  return React.useMemo(
    () => Array.from(byId.values()).sort(compareChunks),
    [byId],
  );
}
