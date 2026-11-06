// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/plans.$planId.tasks.$taskId.trajectories.$trajectoryId';

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

// Keep the real `parseFormData`; only stub the network call.
vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();

  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const {
  TrajectoryViewerDocument,
  TrajectoryViewerLabelDocument,
  TrajectoryViewerRemoveLabelDocument,
} = await import('~/__generated__/graphql');
const {
  MOCK_MY_LABEL,
  MOCK_OTHER_LABEL,
  MOCK_TRAJECTORY,
  MOCK_TRAJECTORY_SUMMARY,
} = await import('~/routing/evals/data/mock.trajectory');
const { TRAJECTORY_LABEL_COPY } =
  await import('~/routing/evals/data/data.copy');
const { action, loader } =
  await import('../plans.$planId.tasks.$taskId.trajectories.$trajectoryId');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const PARAMS = {
  planId: 'plan-1',
  taskId: 'task-1',
  trajectoryId: 'trajectory-1',
};
const URL_PATH = `http://localhost/plans/plan-1/tasks/task-1/trajectories/trajectory-1`;

const loaderArgs = (): Route.LoaderArgs => {
  const request = new Request(URL_PATH);

  return {
    context: createTestRouterContext(),
    params: PARAMS,
    pattern: '/plans/:planId/tasks/:taskId/trajectories/:trajectoryId',
    request,
    url: new URL(request.url),
  };
};

const actionArgs = (entries: Record<string, string>): Route.ActionArgs => {
  const body = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    body.set(key, value);
  }
  const request = new Request(URL_PATH, { body, method: 'POST' });

  return {
    context: createTestRouterContext(),
    params: PARAMS,
    pattern: '/plans/:planId/tasks/:taskId/trajectories/:trajectoryId',
    request,
    url: new URL(request.url),
  };
};

const viewerResult = (overrides: Record<string, unknown> = {}) => {
  return asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
    agentTrajectory: {
      ...MOCK_TRAJECTORY_SUMMARY,
      trajectoryJson: JSON.stringify(MOCK_TRAJECTORY),
    },
    agentTrajectoryLabels: [MOCK_OTHER_LABEL, MOCK_MY_LABEL],
    me: {
      email: MOCK_MY_LABEL.rater,
      githubUsername: 'developer',
      id: 'user-1',
    },
    plan: { id: 'plan-1', title: 'Eval system' },
    task: { id: 'task-1', planId: 'plan-1', title: 'Trajectory viewer' },
    ...overrides,
  });
};

const expectNotFound = async (promise: Promise<unknown>): Promise<void> => {
  const thrown: unknown = await promise.then(
    () => null,
    (error: unknown) => error,
  );

  expect(thrown).toBeInstanceOf(Response);
  expect(thrown instanceof Response ? thrown.status : 0).toBe(404);
};

describe('routes/plans.$planId.tasks.$taskId.trajectories.$trajectoryId', () => {
  beforeEach(() => {
    flags.delta = true;
    mockExecute.mockReset();
  });

  describe('loader', () => {
    test('404s without querying when FEATURE_DELTA_PREVIEW is off', async () => {
      flags.delta = false;

      await expectNotFound(loader(loaderArgs()));
      expect(mockExecute).not.toHaveBeenCalled();
    });

    test('404s when the trajectory does not exist', async () => {
      mockExecute.mockResolvedValue(viewerResult({ agentTrajectory: null }));

      await expectNotFound(loader(loaderArgs()));
    });

    test('404s when the trajectory belongs to another task', async () => {
      mockExecute.mockResolvedValue(
        viewerResult({
          agentTrajectory: {
            ...MOCK_TRAJECTORY_SUMMARY,
            taskId: 'task-2',
            trajectoryJson: '{}',
          },
        }),
      );

      await expectNotFound(loader(loaderArgs()));
    });

    test('parses the document and splits your label from the others', async () => {
      mockExecute.mockResolvedValue(viewerResult());

      const data = await loader(loaderArgs());

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Request),
        TrajectoryViewerDocument,
        PARAMS,
      );
      expect(data.trajectory?.steps).toHaveLength(MOCK_TRAJECTORY.steps.length);
      expect(data.summary).not.toHaveProperty('trajectoryJson');
      expect(data.labels.mine?.id).toBe(MOCK_MY_LABEL.id);
      expect(data.labels.others.map((label) => label.id)).toEqual([
        MOCK_OTHER_LABEL.id,
      ]);
    });

    test('returns a null document when it is not valid ATIF', async () => {
      mockExecute.mockResolvedValue(
        viewerResult({
          agentTrajectory: {
            ...MOCK_TRAJECTORY_SUMMARY,
            trajectoryJson: '{"x":1}',
          },
        }),
      );

      const data = await loader(loaderArgs());

      expect(data.trajectory).toBeNull();
    });
  });

  describe('action', () => {
    test('404s when FEATURE_DELTA_PREVIEW is off', async () => {
      flags.delta = false;

      await expectNotFound(
        action(actionArgs({ intent: 'label', verdict: 'pass' })),
      );
      expect(mockExecute).not.toHaveBeenCalled();
    });

    test('labels with the route trajectory id and the form fields', async () => {
      mockExecute.mockResolvedValue(
        asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
          labelAgentTrajectory: MOCK_MY_LABEL,
        }),
      );

      const result = await action(
        actionArgs({
          failureType: '  wrong-file ',
          intent: 'label',
          note: 'Edited the route.',
          verdict: 'fail',
        }),
      );

      expect(result).toEqual({ label: MOCK_MY_LABEL, ok: true });
      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Request),
        TrajectoryViewerLabelDocument,
        {
          input: {
            failureType: 'wrong-file',
            note: 'Edited the route.',
            trajectoryId: 'trajectory-1',
            verdict: 'fail',
          },
        },
      );
    });

    test('sends null for a blank failure type and note', async () => {
      mockExecute.mockResolvedValue(
        asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
          labelAgentTrajectory: MOCK_MY_LABEL,
        }),
      );

      await action(
        actionArgs({
          failureType: ' ',
          intent: 'label',
          note: '',
          verdict: 'pass',
        }),
      );

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Request),
        TrajectoryViewerLabelDocument,
        {
          input: {
            failureType: null,
            note: null,
            trajectoryId: 'trajectory-1',
            verdict: 'pass',
          },
        },
      );
    });

    test('rejects a verdict other than pass or fail without calling the API', async () => {
      const result = await action(
        actionArgs({ intent: 'label', verdict: 'maybe' }),
      );

      expect(result).toEqual({
        error: TRAJECTORY_LABEL_COPY.verdictRequired,
        ok: false,
      });
      expect(mockExecute).not.toHaveBeenCalled();
    });

    test('surfaces a mutation failure as an error', async () => {
      mockExecute.mockRejectedValue(new Error('Labelling needs an identity'));

      const result = await action(
        actionArgs({ intent: 'label', verdict: 'pass' }),
      );

      expect(result).toEqual({
        error: 'Labelling needs an identity',
        ok: false,
      });
    });

    test('removes your label', async () => {
      mockExecute.mockResolvedValue(
        asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({
          removeAgentTrajectoryLabel: true,
        }),
      );

      const result = await action(actionArgs({ intent: 'removeLabel' }));

      expect(result).toEqual({ ok: true });
      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Request),
        TrajectoryViewerRemoveLabelDocument,
        { trajectoryId: 'trajectory-1' },
      );
    });
  });
});
