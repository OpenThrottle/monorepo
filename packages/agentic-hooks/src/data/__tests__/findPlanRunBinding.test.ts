import { describe, expect, it } from 'vitest';

import type {
  PlanRunToolUse,
  PlanRunTranscriptAdapter,
} from '../findPlanRunBinding.ts';
import { findPlanRunBinding } from '../findPlanRunBinding.ts';

/** A test transcript line: a list of tool calls, and an optional run-id result. */
interface FakeLine {
  readonly runId?: string;
  readonly uses: readonly PlanRunToolUse[];
}

const isFakeLine = (event: unknown): event is FakeLine => {
  return (
    typeof event === 'object' &&
    event !== null &&
    'uses' in event &&
    Array.isArray(event.uses)
  );
};

const adapter: PlanRunTranscriptAdapter = {
  planRunIdOf: (events) => {
    const hit = events.find((event) => {
      return isFakeLine(event) && typeof event.runId === 'string';
    });
    return isFakeLine(hit) ? (hit.runId ?? null) : null;
  },
  toolUsesOf: (event) => {
    return isFakeLine(event) ? event.uses : [];
  },
};

const line = (
  name: string,
  input: Record<string, unknown> = {},
  runId?: string,
): FakeLine => {
  return { runId, uses: [{ input, name: `mcp__ot__${name}` }] };
};

const register = line('register_plan_run', { planId: 'plan-1' }, 'run-1');
const settle = line('settle_plan_run', { status: 'COMPLETED' });
const flip = (id: string | undefined, status: string): FakeLine => {
  return line('update_task', { id, status });
};

describe('findPlanRunBinding', () => {
  describe('when no run is registered', () => {
    it('is none for empty or unreadable events', () => {
      expect(findPlanRunBinding([], adapter)).toEqual({ kind: 'none' });
      expect(
        findPlanRunBinding([null, 'junk', 42, { uses: 'x' }], adapter),
      ).toEqual({ kind: 'none' });
    });

    it('ignores task updates outside a run', () => {
      const binding = findPlanRunBinding([flip('t1', 'IN_PROGRESS')], adapter);
      expect(binding).toEqual({ kind: 'none' });
    });
  });

  describe('when a run is active', () => {
    it('carries the plan, run and current task', () => {
      const binding = findPlanRunBinding(
        [register, flip('t1', 'in_progress')],
        adapter,
      );
      expect(binding).toMatchObject({
        currentTaskId: 't1',
        inProgressTaskIds: ['t1'],
        kind: 'active',
        latestStatus: 'IN_PROGRESS',
        planId: 'plan-1',
        planRunId: 'run-1',
        registerEventIndex: 0,
      });
    });

    it('lists every task still IN_PROGRESS, oldest flip first', () => {
      const binding = findPlanRunBinding(
        [
          register,
          flip('t1', 'IN_PROGRESS'),
          flip('t2', 'IN_PROGRESS'),
          flip('t3', 'IN_PROGRESS'),
          flip('t2', 'COMPLETED'),
        ],
        adapter,
      );
      if (binding.kind !== 'active') throw new Error('expected active');
      expect(binding.inProgressTaskIds).toEqual(['t1', 't3']);
      expect(binding.currentTaskId).toBe('t3');
      expect(binding.lastStatusByTaskId.get('t2')).toBe('COMPLETED');
    });

    it('clears the current task when it leaves IN_PROGRESS', () => {
      const binding = findPlanRunBinding(
        [register, flip('t1', 'IN_PROGRESS'), flip('t1', 'BLOCKED')],
        adapter,
      );
      expect(binding).toMatchObject({
        currentTaskId: null,
        inProgressTaskIds: [],
        latestStatus: 'BLOCKED',
      });
    });

    it('tracks the latest status even when an update names no task', () => {
      const binding = findPlanRunBinding(
        [register, flip(undefined, 'IN_PROGRESS'), line('update_task', {})],
        adapter,
      );
      expect(binding).toMatchObject({
        currentTaskId: null,
        latestStatus: 'IN_PROGRESS',
      });
    });

    it('starts fresh on a second register', () => {
      const second = line('register_plan_run', { planId: 'plan-2' }, 'run-2');
      const binding = findPlanRunBinding(
        [register, flip('t1', 'IN_PROGRESS'), settle, second],
        adapter,
      );
      expect(binding).toMatchObject({
        currentTaskId: null,
        inProgressTaskIds: [],
        kind: 'active',
        planId: 'plan-2',
        planRunId: 'run-2',
        registerEventIndex: 3,
      });
    });

    it('has a null plan id when the register gave none', () => {
      const binding = findPlanRunBinding(
        [line('register_plan_run', {})],
        adapter,
      );
      expect(binding).toMatchObject({
        kind: 'active',
        planId: null,
        planRunId: null,
      });
    });
  });

  describe('when the run is settled', () => {
    it('keeps the task state as it was at the settle', () => {
      const binding = findPlanRunBinding(
        [register, flip('t1', 'IN_PROGRESS'), settle, flip('t1', 'COMPLETED')],
        adapter,
      );
      expect(binding).toMatchObject({
        inProgressTaskIds: ['t1'],
        kind: 'settled',
        planId: 'plan-1',
        planRunId: 'run-1',
      });
    });
  });
});
