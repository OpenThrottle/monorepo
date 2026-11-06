// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

const flags = vi.hoisted(() => {
  return { delta: true };
});

vi.mock('@openthrottle/react-router-utils', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-utils')>();

  return {
    ...actual,
    get FEATURE_DELTA_PREVIEW() {
      return flags.delta;
    },
  };
});

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { TaskAgentTrajectoriesDocument } =
  await import('~/__generated__/graphql');
const { MOCK_TRAJECTORY_SUMMARY } =
  await import('~/routing/evals/data/mock.trajectory');
const { loadTaskTrajectories } = await import('../load-task-trajectories');

const mockExecute = vi.mocked(executeGraphqlWithAuth);
const request = new Request('http://localhost/plans/plan-1/tasks/task-1');

describe('loadTaskTrajectories', () => {
  beforeEach(() => {
    flags.delta = true;
    mockExecute.mockReset();
  });

  test('queries nothing while FEATURE_DELTA_PREVIEW is off', async () => {
    flags.delta = false;

    expect(await loadTaskTrajectories(request, 'task-1')).toEqual([]);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('queries nothing without a task', async () => {
    expect(await loadTaskTrajectories(request, null)).toEqual([]);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test("returns the task's trajectories", async () => {
    mockExecute.mockResolvedValue({
      agentTrajectoriesByTask: [MOCK_TRAJECTORY_SUMMARY],
    });

    expect(await loadTaskTrajectories(request, 'task-1')).toEqual([
      MOCK_TRAJECTORY_SUMMARY,
    ]);
    expect(mockExecute).toHaveBeenCalledWith(
      request,
      TaskAgentTrajectoriesDocument,
      { taskId: 'task-1' },
    );
  });

  test('degrades to empty when the query fails', async () => {
    mockExecute.mockRejectedValue(new Error('boom'));

    expect(await loadTaskTrajectories(request, 'task-1')).toEqual([]);
  });
});
