/**
 * @description Pure list transforms for the job-run-hooks draft editor
 * (PlanWorkflowConfigHooks): patch a single row by draft id, and reorder a row
 * up/down within its own phase group. Extracted from the component so the
 * branching reorder logic is unit-testable in isolation.
 */

import type { JobRunHookDraftRow } from '~/routing/plans/utils/job-run-hooks-ui';

export const updateRow = (
  rows: readonly JobRunHookDraftRow[],
  draftId: string,
  patch: Partial<JobRunHookDraftRow>,
): JobRunHookDraftRow[] =>
  rows.map((row) =>
    row.draftId === draftId ? { ...row, ...patch } : row,
  ) as JobRunHookDraftRow[];

export const moveRowWithinPhase = (
  rows: readonly JobRunHookDraftRow[],
  draftId: string,
  direction: -1 | 1,
): JobRunHookDraftRow[] => {
  const index = rows.findIndex((r) => r.draftId === draftId);
  if (index < 0) return [...rows];

  const phase = rows[index].phase;
  const phaseIndices = rows
    .map((r, i) => (r.phase === phase ? i : -1))
    .filter((i) => i >= 0);
  const posInPhase = phaseIndices.indexOf(index);
  const swapPos = posInPhase + direction;
  if (swapPos < 0 || swapPos >= phaseIndices.length) {
    return [...rows];
  }

  const swapIndex = phaseIndices[swapPos];
  const next = [...rows];
  const current = next[index];

  next[index] = next[swapIndex];
  next[swapIndex] = current;

  return next;
};
