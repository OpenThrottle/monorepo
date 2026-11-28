// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/evals.trajectories._index';

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

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();

  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const {
  AgentTrajectoryScoreState,
  EvalsIndexRepositoriesDocument,
  EvalsTrajectoryPlanGroupsDocument,
} = await import('~/__generated__/graphql');
const { MOCK_PLAN_GROUP_PAGE } =
  await import('~/routing/evals/data/mock.trajectory-plan-groups');
const { loader } = await import('../evals.trajectories._index');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

type ExecuteResult = Awaited<ReturnType<typeof executeGraphqlWithAuth>>;

const loaderArgs = (query = ''): Route.LoaderArgs => {
  const request = new Request(`http://localhost/evals/trajectories${query}`);

  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/evals/trajectories',
    request,
    url: new URL(request.url),
  };
};

const answer = (): void => {
  mockExecute.mockImplementation(async (_request, document) => {
    if (document === EvalsIndexRepositoriesDocument) {
      return asMock<ExecuteResult>({
        workspaceRepositories: [{ id: 'repo-1', name: 'monorepo' }],
      });
    }

    return asMock<ExecuteResult>({
      agentTrajectoryPlanGroups: MOCK_PLAN_GROUP_PAGE,
    });
  });
};

const groupsVariables = (): unknown => {
  const call = mockExecute.mock.calls.find((entry) => {
    return entry[1] === EvalsTrajectoryPlanGroupsDocument;
  });

  return call?.[2];
};

describe('routes/evals.trajectories._index', () => {
  beforeEach(() => {
    flags.delta = true;
    mockExecute.mockReset();
    answer();
  });

  test('404s without querying when FEATURE_DELTA_PREVIEW is off', async () => {
    flags.delta = false;

    const thrown: unknown = await loader(loaderArgs()).then(
      () => null,
      (error: unknown) => error,
    );

    expect(thrown instanceof Response ? thrown.status : 0).toBe(404);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  describe('without a query string', () => {
    test('lists unscored trajectories across every repository', async () => {
      const data = await loader(loaderArgs());

      expect(groupsVariables()).toEqual({
        after: null,
        repositoryId: null,
        scoreState: AgentTrajectoryScoreState.Unscored,
      });
      expect(data).toMatchObject({
        filter: 'unscored',
        page: MOCK_PLAN_GROUP_PAGE,
        repositories: [{ displayName: 'monorepo', id: 'repo-1' }],
        selectedRepositoryId: null,
      });
    });
  });

  describe('with a filter, repository and cursor', () => {
    test('passes them through to the plan-group query', async () => {
      const data = await loader(
        loaderArgs('?score=scored&repositoryId=repo-1&after=cursor-1'),
      );

      expect(groupsVariables()).toEqual({
        after: 'cursor-1',
        repositoryId: 'repo-1',
        scoreState: AgentTrajectoryScoreState.Scored,
      });
      expect(data.selectedRepositoryId).toBe('repo-1');
    });
  });

  describe('with an unknown repository or filter', () => {
    test('falls back to every repository and the unscored filter', async () => {
      const data = await loader(loaderArgs('?score=bogus&repositoryId=nope'));

      expect(groupsVariables()).toMatchObject({
        repositoryId: null,
        scoreState: AgentTrajectoryScoreState.Unscored,
      });
      expect(data.filter).toBe('unscored');
    });
  });
});
