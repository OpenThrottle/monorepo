import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import type { Route } from '@/app/routes/+types/plans.$planId._index';
import { loader } from '../plans.$planId._index';
import { PlanDetailIndexLoaderDocument } from '~/__generated__/graphql';
import { createTestRouterContext } from '~/testing/router-context';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

const planId = '80864bba-630a-451d-bfd2-4b25ec202381';

describe('routes/plans.$planId._index loader', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('returns an empty data shape and skips GraphQL when planId is missing', async () => {
    const result = await loader({
      context: createTestRouterContext(),
      params: {},
      pattern: '/plans/:planId',
      request: new Request('http://localhost/plans/'),
      url: new URL('http://localhost/plans/'),
    } as unknown as Route.LoaderArgs);

    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    expect(result).toEqual({
      plan: null,
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      tasks: [],
    });
  });

  test('queries with the loader document and maps the page response to loaderData', async () => {
    const plan = { __typename: 'PlanObject', id: planId, title: 'Test Plan' };
    const outputChunks = [
      { __typename: 'PlanOutputStreamChunkObject', id: 'c1' },
    ];
    const auditRows = [{ __typename: 'PlanRunObject', id: 'run-1' }];
    const recentRuns = [{ __typename: 'PlanRunMetricObject', id: 'm-1' }];
    const tasks = [{ __typename: 'TaskObject', id: 'task-1' }];

    mockExecuteGraphqlWithAuth.mockResolvedValue({
      metrics: { recentPlanRunsMetrics: recentRuns },
      plan,
      planOutputStreamChunks: outputChunks,
      planRunsByPlanId: auditRows,
      tasksByPlanId: tasks,
    });

    const request = new Request(`http://localhost/plans/${planId}`);
    const result = await loader({
      context: createTestRouterContext(),
      params: { planId },
      pattern: '/plans/:planId',
      request,
      url: new URL(request.url),
    } satisfies Route.LoaderArgs);

    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      request,
      PlanDetailIndexLoaderDocument,
      { planId },
    );
    expect(result).toEqual({
      plan,
      planOutputChunks: outputChunks,
      planRunAuditRows: auditRows,
      recentPlanRuns: recentRuns,
      tasks,
    });
  });

  test('coalesces nullish page collections to empty arrays and a null plan', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue({
      metrics: { recentPlanRunsMetrics: null },
      plan: null,
      planOutputStreamChunks: null,
      planRunsByPlanId: null,
      tasksByPlanId: null,
    });

    const request = new Request(`http://localhost/plans/${planId}`);
    const result = await loader({
      context: createTestRouterContext(),
      params: { planId },
      pattern: '/plans/:planId',
      request,
      url: new URL(request.url),
    } satisfies Route.LoaderArgs);

    expect(result).toEqual({
      plan: null,
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      tasks: [],
    });
  });
});
