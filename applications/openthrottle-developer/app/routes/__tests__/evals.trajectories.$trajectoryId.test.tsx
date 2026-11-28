// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/evals.trajectories.$trajectoryId';

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
  EvalsTrajectoryViewerDocument,
  EvalsTrajectoryViewerPlanDocument,
  EvalsTrajectoryViewerScoringDocument,
  EvalsTrajectoryViewerTaskDocument,
  TrajectoryViewerLabelDocument,
  TrajectoryViewerRemoveLabelDocument,
} = await import('~/__generated__/graphql');
const {
  MOCK_MY_LABEL,
  MOCK_OTHER_LABEL,
  MOCK_TRAJECTORY,
  MOCK_TRAJECTORY_SUMMARY,
} = await import('~/routing/evals/data/mock.trajectory');
const { action, loader } = await import('../evals.trajectories.$trajectoryId');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

type ExecuteResult = Awaited<ReturnType<typeof executeGraphqlWithAuth>>;

const PARAMS = { trajectoryId: 'trajectory-1' };
const URL_PATH = `http://localhost/evals/trajectories/trajectory-1`;
const PATTERN = '/evals/trajectories/:trajectoryId';

const loaderArgs = (): Route.LoaderArgs => {
  const request = new Request(URL_PATH);

  return {
    context: createTestRouterContext(),
    params: PARAMS,
    pattern: PATTERN,
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
    pattern: PATTERN,
    request,
    url: new URL(request.url),
  };
};

const viewerResult = (
  record: Record<string, unknown> | null,
): ExecuteResult => {
  return asMock<ExecuteResult>({
    agentTrajectory: record,
    agentTrajectoryLabels: [MOCK_OTHER_LABEL, MOCK_MY_LABEL],
    me: {
      email: MOCK_MY_LABEL.rater,
      githubUsername: 'developer',
      id: 'user-1',
    },
  });
};

const record = (overrides: Record<string, unknown> = {}) => {
  return {
    ...MOCK_TRAJECTORY_SUMMARY,
    planId: 'plan-1',
    trajectoryJson: JSON.stringify(MOCK_TRAJECTORY),
    ...overrides,
  };
};

/** Answers each document the loader sends with its own canned result. */
const answerByDocument = (viewer: ExecuteResult): void => {
  mockExecute.mockImplementation(async (_request, document) => {
    if (document === EvalsTrajectoryViewerDocument) return viewer;
    if (document === EvalsTrajectoryViewerPlanDocument) {
      return asMock<ExecuteResult>({
        plan: { id: 'plan-1', title: 'Eval system' },
      });
    }
    if (document === EvalsTrajectoryViewerTaskDocument) {
      return asMock<ExecuteResult>({
        task: { id: 'task-1', title: 'Trajectory viewer' },
      });
    }
    if (document === EvalsTrajectoryViewerScoringDocument) {
      return asMock<ExecuteResult>({
        plan: {
          groups: [
            {
              planId: 'plan-1',
              planTitle: 'Eval system',
              scoredCount: 1,
              trajectories: [
                { id: 'trajectory-1', verdict: 'pass' },
                { id: 'trajectory-2', verdict: null },
              ],
              trajectoryCount: 2,
            },
          ],
        },
        unscored: { groups: [] },
      });
    }

    throw new Error('unexpected document');
  });
};

const documentsSent = (): unknown[] => {
  return mockExecute.mock.calls.map((call) => call[1]);
};

const expectNotFound = async (promise: Promise<unknown>): Promise<void> => {
  const thrown: unknown = await promise.then(
    () => null,
    (error: unknown) => error,
  );

  expect(thrown).toBeInstanceOf(Response);
  expect(thrown instanceof Response ? thrown.status : 0).toBe(404);
};

describe('routes/evals.trajectories.$trajectoryId', () => {
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
      answerByDocument(viewerResult(null));

      await expectNotFound(loader(loaderArgs()));
      expect(documentsSent()).toEqual([EvalsTrajectoryViewerDocument]);
    });

    test("offers the plan's next unscored trajectory", async () => {
      answerByDocument(viewerResult(record({ taskId: 'task-1' })));

      const data = await loader(loaderArgs());

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Request),
        EvalsTrajectoryViewerScoringDocument,
        { hasPlan: true, planId: 'plan-1' },
      );
      expect(data.scoring).toEqual({
        next: { kind: 'in-plan', trajectoryId: 'trajectory-2' },
        scoredCount: 1,
        trajectoryCount: 2,
      });
    });

    describe('for a task-scoped trajectory', () => {
      test('reads its plan and task for the breadcrumbs', async () => {
        answerByDocument(viewerResult(record({ taskId: 'task-1' })));

        const data = await loader(loaderArgs());

        expect(mockExecute).toHaveBeenCalledWith(
          expect.any(Request),
          EvalsTrajectoryViewerDocument,
          PARAMS,
        );
        expect(data.plan?.id).toBe('plan-1');
        expect(data.task?.id).toBe('task-1');
        expect(data.trajectory?.steps).toHaveLength(
          MOCK_TRAJECTORY.steps.length,
        );
        expect(data.summary).not.toHaveProperty('trajectoryJson');
        expect(data.labels.mine?.id).toBe(MOCK_MY_LABEL.id);
        expect(data.labels.others.map((label) => label.id)).toEqual([
          MOCK_OTHER_LABEL.id,
        ]);
      });
    });

    describe('for a plan-scoped trajectory', () => {
      test('opens it without a task lookup', async () => {
        answerByDocument(viewerResult(record({ taskId: null })));

        const data = await loader(loaderArgs());

        expect(documentsSent()).not.toContain(
          EvalsTrajectoryViewerTaskDocument,
        );
        expect(data.task).toBeNull();
        expect(data.plan?.id).toBe('plan-1');
        expect(data.summary.taskId).toBeNull();
      });
    });

    describe('when the plan can no longer be resolved', () => {
      test('renders with no plan context', async () => {
        answerByDocument(viewerResult(record({ planId: null, taskId: null })));

        const data = await loader(loaderArgs());

        expect(documentsSent()).not.toContain(
          EvalsTrajectoryViewerPlanDocument,
        );
        expect(mockExecute).toHaveBeenCalledWith(
          expect.any(Request),
          EvalsTrajectoryViewerScoringDocument,
          { hasPlan: false, planId: null },
        );
        expect(data.plan).toBeNull();
      });
    });

    test('returns a null document when it is not valid ATIF', async () => {
      answerByDocument(viewerResult(record({ trajectoryJson: '{"x":1}' })));

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
        asMock<ExecuteResult>({ labelAgentTrajectory: MOCK_MY_LABEL }),
      );

      const result = await action(
        actionArgs({ intent: 'label', note: 'Fine.', verdict: 'pass' }),
      );

      expect(result).toEqual({ label: MOCK_MY_LABEL, ok: true });
      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Request),
        TrajectoryViewerLabelDocument,
        {
          input: {
            failureType: null,
            note: 'Fine.',
            trajectoryId: 'trajectory-1',
            verdict: 'pass',
          },
        },
      );
    });

    test('removes your label', async () => {
      mockExecute.mockResolvedValue(
        asMock<ExecuteResult>({ removeAgentTrajectoryLabel: true }),
      );

      const result = await action(actionArgs({ intent: 'removeLabel' }));

      expect(result).toEqual({ ok: true });
      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Request),
        TrajectoryViewerRemoveLabelDocument,
        { trajectoryId: 'trajectory-1' },
      );
    });

    test('refuses an unknown intent without calling the API', async () => {
      const result = await action(actionArgs({ intent: 'nope' }));

      expect(result).toEqual({ error: 'Unknown action.', ok: false });
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });
});
