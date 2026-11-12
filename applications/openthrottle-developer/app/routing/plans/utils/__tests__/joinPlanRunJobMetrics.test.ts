import { describe, expect, test } from 'vitest';

import type { PlanRunMetricsEntry } from '../joinPlanRunJobMetrics';
import { joinPlanRunJobMetrics } from '../joinPlanRunJobMetrics';

const FINISHED_ON = Date.UTC(2026, 2, 14, 12, 0, 0);

const entry = (
  jobId: string,
  overrides: Partial<PlanRunMetricsEntry> = {},
): PlanRunMetricsEntry => {
  return {
    executionBackend: 'local',
    finishedOn: FINISHED_ON,
    jobId,
    taskRunMetrics: { atEnd: { rssMb: 412.5 } },
    ...overrides,
  };
};

describe('joinPlanRunJobMetrics', () => {
  describe('when a run has a matching job', () => {
    test('attaches finishedOn as ISO and the end RSS, keyed by run id', () => {
      const joined = joinPlanRunJobMetrics(
        [{ bullmqJobId: 'job-1', id: 'run-1' }],
        [entry('job-1')],
      );

      expect(joined.get('run-1')).toEqual({
        finishedOn: new Date(FINISHED_ON).toISOString(),
        rssEndMb: 412.5,
      });
    });

    test('nulls fields the entry does not carry', () => {
      const joined = joinPlanRunJobMetrics(
        [{ bullmqJobId: 'job-1', id: 'run-1' }],
        [entry('job-1', { finishedOn: null, taskRunMetrics: null })],
      );

      expect(joined.get('run-1')).toEqual({ finishedOn: null, rssEndMb: null });
    });

    test('treats a non-finite finishedOn as absent', () => {
      const joined = joinPlanRunJobMetrics(
        [{ bullmqJobId: 'job-1', id: 'run-1' }],
        [entry('job-1', { finishedOn: Number.NaN })],
      );

      expect(joined.get('run-1')?.finishedOn).toBeNull();
    });
  });

  describe('when a metrics entry matches no run', () => {
    test('drops it', () => {
      const joined = joinPlanRunJobMetrics(
        [{ bullmqJobId: 'job-1', id: 'run-1' }],
        [entry('job-1'), entry('job-orphan')],
      );

      expect([...joined.keys()]).toEqual(['run-1']);
    });
  });

  describe('when a run has no job', () => {
    test('gets no metrics', () => {
      const joined = joinPlanRunJobMetrics(
        [{ bullmqJobId: null, id: 'run-cli' }, { id: 'run-orchestrator' }],
        [entry('job-1')],
      );

      expect(joined.size).toBe(0);
    });
  });

  describe('when a run has a job with no metrics entry', () => {
    test('gets no metrics', () => {
      const joined = joinPlanRunJobMetrics(
        [{ bullmqJobId: 'job-2', id: 'run-2' }],
        [entry('job-1')],
      );

      expect(joined.has('run-2')).toBe(false);
    });
  });
});
