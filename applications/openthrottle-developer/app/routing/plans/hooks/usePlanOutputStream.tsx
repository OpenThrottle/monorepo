/**
 * @description Live plan-output stream for the plan detail view. Implements the
 * loader-snapshot-seed + subscription-delta pattern: state is seeded from the
 * loader's planOutputStreamChunks, new chunks arrive via the planOutputChunkAdded
 * subscription, and everything is keyed by chunk id so the snapshot/subscription
 * overlap dedupes cleanly. On navigation/revalidation the fresh loader snapshot
 * is merged back in. SSR-safe: with no browser ws client the hook just returns
 * the seed.
 *
 * **The snapshot is deferred and may arrive late.** `seedChunks` is `undefined`
 * until the loader's `outputChunks` promise resolves, and on an actively-running
 * plan the subscription will deliver chunks before that happens. The merge is
 * therefore order-independent: deltas are accepted from mount regardless of
 * snapshot availability, and the snapshot is unioned in by chunk id whenever it
 * lands. Neither source is "first" and neither overwrites the other.
 *
 * **Called from `usePlanDetailRoute`, above the Output tab's Await boundary.**
 * Inside the boundary would be simpler, but the tab unmounts on every tab switch
 * and would tear the subscription down with it — chunks written while the user
 * is on Details would then be missing until the next revalidation. Living at
 * route level keeps one subscription alive for the whole visit, which also pairs
 * with the query's bounded `limit: 200` tail: the snapshot is a window, the
 * subscription is the tail, and the union is what the user sees.
 *
 * Merging (rather than replacing) on re-resolution means a chunk that has
 * scrolled out of the 200-item snapshot window stays on screen for the rest of
 * the visit instead of vanishing mid-session.
 */
import type {
  PlanDetailOutputChunksQuery,
  PlanOutputChunkAddedSubscription,
} from '@openthrottle/openthrottle-developer-codegen';
import { useSubscription } from '@openthrottle/react-router-graphql';
import * as React from 'react';
import { PlanOutputChunkAddedDocument } from '~/__generated__/graphql';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

type Chunk = PlanDetailOutputChunksQuery['planOutputStreamChunks'][number];

/**
 * Order by iteration, then createdAt, then id, so renders are stable regardless
 * of arrival order.
 *
 * Iteration is compared only when both chunks carry one: it is nullable, and
 * treating a missing iteration as 0 would hoist un-numbered chunks above
 * everything else. When either side is missing, createdAt decides — which is the
 * order the resolver already returns (`createdAt: 'ASC'`). Id is the final
 * tiebreak so two chunks written in the same millisecond never swap between
 * renders.
 */
function compareChunks(a: Chunk, b: Chunk): number {
  if (
    typeof a.iteration === 'number' &&
    typeof b.iteration === 'number' &&
    a.iteration !== b.iteration
  ) {
    return a.iteration < b.iteration ? -1 : 1;
  }

  const at = String(a.createdAt);
  const bt = String(b.createdAt);

  if (at !== bt) return at < bt ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;

  return 0;
}

export function usePlanOutputStream(
  planId: string,
  seedChunks: readonly Chunk[] | undefined,
): Chunk[] {
  // Hooks
  // 🚨 `undefined` means "the snapshot has not resolved yet", which is different
  // from "there are no chunks". Accepting it here rather than making callers
  // pass a placeholder array is what keeps the seed's identity stable across
  // renders — an inline `?? []` at the call site would allocate a fresh array
  // every render and the re-seed effect below would loop forever on it.
  const [byId, setById] = React.useState<ReadonlyMap<string, Chunk>>(
    () => new Map((seedChunks ?? []).map((chunk) => [chunk.id, chunk])),
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
    if (seedChunks === undefined) return;

    setById((previous) => {
      // 🚨 Return `previous` unchanged when the snapshot adds nothing. Always
      // allocating a new Map makes this effect a state change, and with a seed
      // whose identity is not stable that is an infinite render loop.
      const isNoop = seedChunks.every(
        (chunk) => previous.get(chunk.id) === chunk,
      );
      if (isNoop) return previous;

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
