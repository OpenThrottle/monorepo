import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import type { Route } from '@/app/routes/+types/plans.$planId._index';
import { loader } from '../plans.$planId._index';
import { PlanDetailIndexLoaderDocument } from '~/__generated__/graphql';
import {
  createLoaderArgs,
  createTestRouterContext,
} from '@openthrottle/react-router-testing';

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
    const result = await loader(
      createLoaderArgs<Route.LoaderArgs>({ url: 'http://localhost/plans/' }),
    );

    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    expect(result).toEqual({
      linkedArtifacts: [],
      plan: null,
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      ruleApplications: [],
      tagVocabulary: [],
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
    const ruleApplications = [
      { __typename: 'RuleApplicationObject', id: 'app-1' },
    ];
    const vocabularyTags = [{ __typename: 'SkillTagObject', id: 'tag-1' }];
    const linkedArtifacts = [{ __typename: 'WorkArtifactObject', id: 'art-1' }];

    mockExecuteGraphqlWithAuth.mockResolvedValue({
      metrics: { recentPlanRunsMetrics: recentRuns },
      plan,
      planOutputStreamChunks: outputChunks,
      planRunsByPlanId: auditRows,
      ruleApplications,
      skillTagVocabulary: { tags: vocabularyTags, totalCount: 1 },
      tasksByPlanId: tasks,
      workArtifactsByPlan: { artifacts: linkedArtifacts, totalCount: 1 },
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
      linkedArtifacts,
      plan,
      planOutputChunks: outputChunks,
      planRunAuditRows: auditRows,
      recentPlanRuns: recentRuns,
      ruleApplications,
      tagVocabulary: vocabularyTags,
      tasks,
    });
  });

  test('coalesces nullish page collections to empty arrays and a null plan', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue({
      metrics: { recentPlanRunsMetrics: null },
      plan: null,
      planOutputStreamChunks: null,
      planRunsByPlanId: null,
      ruleApplications: null,
      skillTagVocabulary: { tags: null, totalCount: 0 },
      tasksByPlanId: null,
      workArtifactsByPlan: { artifacts: null, totalCount: 0 },
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
      linkedArtifacts: [],
      plan: null,
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      ruleApplications: [],
      tagVocabulary: [],
      tasks: [],
    });
  });
});
