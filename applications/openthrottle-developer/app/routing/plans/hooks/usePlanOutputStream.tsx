/**
 * @description Live plan-output stream for the plan detail view. Implements the
 * loader-snapshot-seed + subscription-delta pattern: state is seeded from the
 * loader's planOutputStreamChunks, new chunks arrive via the planOutputChunkAdded
 * subscription, and everything is keyed by chunk id so the snapshot/subscription
 * overlap dedupes cleanly. On navigation/revalidation the fresh loader snapshot
 * is merged back in (authoritative for persisted chunks). SSR-safe: with no
 * browser ws client the hook just returns the seed.
 */
import type {
  PlanDetailIndexLoaderQuery,
  PlanOutputChunkAddedSubscription,
} from '@openthrottle/openthrottle-developer-codegen';
import { useSubscription } from '@openthrottle/react-router-graphql';
import * as React from 'react';
import { PlanOutputChunkAddedDocument } from '~/__generated__/graphql';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

type Chunk = PlanDetailIndexLoaderQuery['planOutputStreamChunks'][number];

/** Order by createdAt, then id, so renders are stable regardless of arrival order. */
function compareChunks(a: Chunk, b: Chunk): number {
  const at = String(a.createdAt);
  const bt = String(b.createdAt);

  if (at !== bt) return at < bt ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;

  return 0;
}

export function usePlanOutputStream(
  planId: string,
  seedChunks: Chunk[],
): Chunk[] {
  // Hooks
  const [byId, setById] = React.useState<ReadonlyMap<string, Chunk>>(
    () => new Map(seedChunks.map((chunk) => [chunk.id, chunk])),
  );

  // Setup
  const client = React.useMemo(() => getGraphqlWsClient(), []);

  // Handlers
  const onData = (data: PlanOutputChunkAddedSubscription) => {
    const chunk = data.planOutputChunkAdded;

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
    setById((previous) => {
      const next = new Map(previous);
      for (const chunk of seedChunks) next.set(chunk.id, chunk);

      return next;
    });

    // Re-seed from the loader snapshot on navigation/revalidation. Merge (don't
    // replace) so a live delta that hasn't yet landed in a fresh snapshot survives.
  }, [seedChunks]);

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
