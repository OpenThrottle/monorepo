import { describe, expect, test } from 'vitest';
import {
  moveRowWithinPhase,
  updateRow,
} from '~/routing/plans/utils/job-run-hooks-draft';
import type { JobRunHookDraftRow } from '~/routing/plans/utils/job-run-hooks-ui';

const promptRow = (
  draftId: string,
  phase: JobRunHookDraftRow['phase'],
  order: number,
): JobRunHookDraftRow => ({
  draftId,
  kind: 'prompt_profile',
  onFailure: undefined,
  order,
  phase,
  prompt: '/agents-ralph',
  promptDelivery: 'named',
  timeoutSeconds: undefined,
});

describe('updateRow', () => {
  test('patches only the row matching draftId', () => {
    const rows = [
      promptRow('a', 'before_run', 0),
      promptRow('b', 'after_run', 0),
    ];

    const next = updateRow(rows, 'b', { timeoutSeconds: 30 });

    expect(next).toHaveLength(2);
    expect(next[0]).toEqual(rows[0]);
    expect(next[1].timeoutSeconds).toBe(30);
    // original rows are not mutated
    expect(rows[1].timeoutSeconds).toBeUndefined();
  });

  test('returns an equivalent list when draftId is not found', () => {
    const rows = [promptRow('a', 'before_run', 0)];

    expect(updateRow(rows, 'missing', { timeoutSeconds: 5 })).toEqual(rows);
  });
});

describe('moveRowWithinPhase', () => {
  test('swaps with the previous row in the same phase', () => {
    const rows = [
      promptRow('a', 'before_run', 0),
      promptRow('b', 'before_run', 1),
    ];

    const next = moveRowWithinPhase(rows, 'b', -1);

    expect(next.map((r) => r.draftId)).toEqual(['b', 'a']);
  });

  test('swaps with the next row in the same phase', () => {
    const rows = [
      promptRow('a', 'before_run', 0),
      promptRow('b', 'before_run', 1),
    ];

    const next = moveRowWithinPhase(rows, 'a', 1);

    expect(next.map((r) => r.draftId)).toEqual(['b', 'a']);
  });

  test('only reorders within the row phase, skipping other-phase rows', () => {
    const rows = [
      promptRow('a', 'before_run', 0),
      promptRow('x', 'after_run', 0),
      promptRow('b', 'before_run', 1),
    ];

    // 'b' is the 2nd before_run row; moving up swaps it with 'a' (1st
    // before_run), leaving the interleaved after_run row 'x' in place.
    const next = moveRowWithinPhase(rows, 'b', -1);

    expect(next.map((r) => r.draftId)).toEqual(['b', 'x', 'a']);
  });

  test('is a no-op at the phase boundary', () => {
    const rows = [
      promptRow('a', 'before_run', 0),
      promptRow('b', 'before_run', 1),
    ];

    expect(moveRowWithinPhase(rows, 'a', -1).map((r) => r.draftId)).toEqual([
      'a',
      'b',
    ]);
    expect(moveRowWithinPhase(rows, 'b', 1).map((r) => r.draftId)).toEqual([
      'a',
      'b',
    ]);
  });

  test('returns an equivalent list when draftId is not found', () => {
    const rows = [promptRow('a', 'before_run', 0)];

    expect(moveRowWithinPhase(rows, 'missing', 1)).toEqual(rows);
  });
});
