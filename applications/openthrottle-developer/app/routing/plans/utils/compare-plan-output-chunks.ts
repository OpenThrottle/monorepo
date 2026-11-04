import type { PlanDetailOutputChunksQuery } from '@openthrottle/openthrottle-developer-codegen';

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
export const comparePlanOutputChunks = (a: Chunk, b: Chunk): number => {
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
};
