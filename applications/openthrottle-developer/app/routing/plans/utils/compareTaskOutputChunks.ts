import type { PlanOutputChunkFragment } from '@openthrottle/openthrottle-developer-codegen';

/** Order by createdAt, then id, so renders are stable regardless of arrival order. */
export const compareTaskOutputChunks = (
  a: PlanOutputChunkFragment,
  b: PlanOutputChunkFragment,
): number => {
  const at = String(a.createdAt);
  const bt = String(b.createdAt);

  if (at !== bt) return at < bt ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;

  return 0;
};
