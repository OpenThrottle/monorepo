import { describe, expect, test } from 'vitest';

import { collectResumedRunIds } from '../utils.usage-limit';

describe('collectResumedRunIds', () => {
  test('collects the run each continuation run resumes', () => {
    const resumedRunIds = collectResumedRunIds([
      { resumeOfRunId: 'run-1' },
      { resumeOfRunId: 'run-2' },
    ]);

    expect([...resumedRunIds]).toEqual(['run-1', 'run-2']);
  });

  test('skips runs that continue nothing', () => {
    const resumedRunIds = collectResumedRunIds([
      {},
      { resumeOfRunId: null },
      { resumeOfRunId: 'run-1' },
    ]);

    expect([...resumedRunIds]).toEqual(['run-1']);
  });

  test('returns an empty set for an empty list', () => {
    expect(collectResumedRunIds([]).size).toBe(0);
  });
});
