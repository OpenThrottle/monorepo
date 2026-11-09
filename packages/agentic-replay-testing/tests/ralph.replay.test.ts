/**
 * Replay recorded plan-run transcripts through the REAL Ralph orchestrator and
 * the production drivers engine. The agent process (a replay bin resolved as
 * `claude` off PATH) and OpenThrottle (the in-memory store) are the only
 * stand-ins, so this is the engine seeing real agent output: the structured
 * stream rendered back to prose, the markers parsed, and the task and plan
 * status transitions that follow.
 */

import { describe, expect, it } from 'vitest';

import {
  PLAN_RUN_PLAN_ID,
  planRunTaskId,
  replayFixturePath,
  replayPlanRun,
  type ReplayPlanRunResult,
} from '../src/index.ts';

const TASK = planRunTaskId(0);

const replayStrictPlanRun = async (
  path: string,
): Promise<ReplayPlanRunResult> => {
  const result = await replayPlanRun(path);
  expect(result.report).toEqual({ ok: true });
  return result;
};

const stdoutOf = (result: ReplayPlanRunResult): string => {
  return result.chunks
    .filter((chunk) => chunk.stream === 'stdout')
    .map((chunk) => chunk.data)
    .join('');
};

describe('Ralph orchestrator replaying claude', () => {
  describe('plan-run-complete', () => {
    it('completes the task from the agent marker and closes the plan', async () => {
      const result = await replayStrictPlanRun(
        replayFixturePath('claude', 'plan-run-complete'),
      );

      expect(result.store.statusChanges()).toEqual([
        { entity: 'plan', id: PLAN_RUN_PLAN_ID, status: 'IN_PROGRESS' },
        { entity: 'task', id: TASK, status: 'IN_PROGRESS' },
        { entity: 'task', id: TASK, status: 'COMPLETED' },
        { entity: 'plan', id: PLAN_RUN_PLAN_ID, status: 'COMPLETED' },
      ]);
      expect(result.outcome).toEqual({
        exitCode: 0,
        reason: 'workflow_tasks_exhausted',
        status: 'finished',
      });
    });

    it('streams the agent text rendered from structured output', async () => {
      const result = await replayStrictPlanRun(
        replayFixturePath('claude', 'plan-run-complete'),
      );

      expect(result.transcript.argv).toEqual(
        expect.arrayContaining(['--output-format', 'stream-json']),
      );
      expect(stdoutOf(result).trim()).toBe(
        `<ralph:task-complete>${TASK}</ralph:task-complete>`,
      );
    });
  });

  describe('plan-run-error', () => {
    it('fails the run on the error marker and hands the task back', async () => {
      const result = await replayStrictPlanRun(
        replayFixturePath('claude', 'plan-run-error'),
      );

      expect(result.outcome).toEqual({
        exitCode: 1,
        reason: 'workflow_agent_error',
        status: 'failed',
      });
      // The host settles the run FAILED and moves neither the task nor the
      // plan, so the orchestrator does: the task back to PENDING and the plan
      // BLOCKED, as at the iteration limit.
      expect(result.store.statusChanges().slice(-2)).toEqual([
        { entity: 'task', id: TASK, status: 'PENDING' },
        { entity: 'plan', id: PLAN_RUN_PLAN_ID, status: 'BLOCKED' },
      ]);
      expect(result.store.output()).toEqual([
        expect.stringContaining('Agent reported an error (iteration 1)'),
      ]);
    });
  });

  describe('plan-run-no-marker', () => {
    it('hands the task back and blocks the plan when iterations run out', async () => {
      const result = await replayStrictPlanRun(
        replayFixturePath('claude', 'plan-run-no-marker'),
      );

      expect(stdoutOf(result).trim()).toBe('not yet');
      expect(result.store.statusChanges().slice(-2)).toEqual([
        { entity: 'task', id: TASK, status: 'PENDING' },
        { entity: 'plan', id: PLAN_RUN_PLAN_ID, status: 'BLOCKED' },
      ]);
      expect(result.store.output()).toEqual([
        expect.stringContaining('Iteration limit reached (1/1)'),
      ]);
      expect(result.outcome).toMatchObject({
        reason: 'workflow_max_iterations',
      });
    });
  });
});

/**
 * The same three scenarios recorded against the other CLIs whose plan-run
 * drivers the engine runs. Each table row names its transcript literally so
 * the coverage guard sees it. opencode was recorded with `opencode/big-pickle`:
 * on the recording account its plan-run default model is gated behind a
 * provider form.
 */
describe.each([
  {
    backend: 'codex',
    complete: replayFixturePath('codex', 'plan-run-complete'),
    error: replayFixturePath('codex', 'plan-run-error'),
    noMarker: replayFixturePath('codex', 'plan-run-no-marker'),
  },
  {
    backend: 'cursor',
    complete: replayFixturePath('cursor', 'plan-run-complete'),
    error: replayFixturePath('cursor', 'plan-run-error'),
    noMarker: replayFixturePath('cursor', 'plan-run-no-marker'),
  },
  {
    backend: 'opencode',
    complete: replayFixturePath('opencode', 'plan-run-complete'),
    error: replayFixturePath('opencode', 'plan-run-error'),
    noMarker: replayFixturePath('opencode', 'plan-run-no-marker'),
  },
  {
    backend: 'antigravity',
    complete: replayFixturePath('antigravity', 'plan-run-complete'),
    error: replayFixturePath('antigravity', 'plan-run-error'),
    noMarker: replayFixturePath('antigravity', 'plan-run-no-marker'),
  },
])('Ralph orchestrator replaying $backend', ({ complete, error, noMarker }) => {
  it('closes the plan on the completion marker', async () => {
    const result = await replayStrictPlanRun(complete);

    expect(result.store.taskStatus(TASK)).toBe('COMPLETED');
    expect(result.store.planStatus()).toBe('COMPLETED');
  });

  it('fails the run on the error marker', async () => {
    const result = await replayStrictPlanRun(error);

    expect(result.outcome).toMatchObject({ reason: 'workflow_agent_error' });
    expect(result.store.taskStatus(TASK)).toBe('PENDING');
    expect(result.store.planStatus()).toBe('BLOCKED');
  });

  it('blocks the plan when no marker arrives', async () => {
    const result = await replayStrictPlanRun(noMarker);

    expect(result.store.planStatus()).toBe('BLOCKED');
    expect(result.store.taskStatus(TASK)).toBe('PENDING');
  });
});
