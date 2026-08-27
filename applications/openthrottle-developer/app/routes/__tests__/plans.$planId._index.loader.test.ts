import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import type { Route } from '@/app/routes/+types/plans.$planId._index';
import { loader } from '../plans.$planId._index';
import {
  PlanDetailCriticalDocument,
  PlanDetailLedgerDocument,
  PlanDetailOutputChunksDocument,
  PlanDetailRunHistoryDocument,
  PlanDetailTagVocabularyDocument,
  PlanDetailWorkspaceEditorsDocument,
  PlanDetailWorkspaceRepositoriesDocument,
} from '~/__generated__/graphql';
import {
  createLoaderArgs,
  createTestRouterContext,
} from '@openthrottle/react-router-testing';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

const planId = '80864bba-630a-451d-bfd2-4b25ec202381';

const plan = { __typename: 'PlanObject', id: planId, title: 'Test Plan' };
const tasks = [{ __typename: 'TaskObject', id: 'task-1' }];
const outputChunks = [{ __typename: 'PlanOutputStreamChunkObject', id: 'c1' }];
const auditRows = [{ __typename: 'PlanRunObject', id: 'run-1' }];
const recentRuns = [{ __typename: 'PlanRunMetricObject', id: 'm-1' }];
const ruleApplications = [{ __typename: 'RuleApplicationObject', id: 'app-1' }];
const vocabularyTags = [{ __typename: 'SkillTagObject', id: 'tag-1' }];
const linkedArtifacts = [{ __typename: 'WorkArtifactObject', id: 'art-1' }];
const repositories = [{ __typename: 'RepositoryObject', id: 'repo-1' }];

/**
 * Route each of the six documents to its own response, so a test can prove the
 * loader issued the right query per key rather than one combined round trip.
 * `overrides` swaps a single document's outcome (a null payload, or a rejection).
 */
function mockDocuments(
  overrides: Map<unknown, unknown> = new Map<unknown, unknown>(),
): void {
  const responses = new Map<unknown, unknown>([
    [PlanDetailCriticalDocument, { plan, tasksByPlanId: tasks }],
    [
      PlanDetailLedgerDocument,
      {
        ruleApplications,
        workArtifactsByPlan: { artifacts: linkedArtifacts, totalCount: 1 },
      },
    ],
    [PlanDetailOutputChunksDocument, { planOutputStreamChunks: outputChunks }],
    [
      PlanDetailRunHistoryDocument,
      {
        metrics: { recentPlanRunsMetrics: recentRuns },
        planRunsByPlanId: auditRows,
      },
    ],
    [
      PlanDetailTagVocabularyDocument,
      { skillTagVocabulary: { tags: vocabularyTags, totalCount: 1 } },
    ],
    [
      PlanDetailWorkspaceRepositoriesDocument,
      { workspaceRepositories: repositories },
    ],
    [
      PlanDetailWorkspaceEditorsDocument,
      { workspaceSettings: { profile: { enabledEditors: [] } } },
    ],
  ]);

  for (const [document, response] of overrides) {
    responses.set(document, response);
  }

  mockExecuteGraphqlWithAuth.mockImplementation((_request, document) => {
    const response = responses.get(document);
    if (response instanceof Error) return Promise.reject(response);
    return Promise.resolve(response);
  });
}

function callLoader(): ReturnType<typeof loader> {
  const request = new Request(`http://localhost/plans/${planId}`);
  return loader({
    context: createTestRouterContext(),
    params: { planId },
    pattern: '/plans/:planId',
    request,
    url: new URL(request.url),
  } satisfies Route.LoaderArgs);
}

describe('routes/plans.$planId._index loader', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('returns an empty data shape and skips GraphQL when planId is missing', async () => {
    const result = await loader(
      createLoaderArgs<Route.LoaderArgs>({ url: 'http://localhost/plans/' }),
    );

    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    expect(result.plan).toBeNull();
    expect(result.tasks).toEqual([]);

    // The deferred keys stay promises so the component's Await boundaries are
    // type-uniform with the real branch.
    await expect(result.ledger).resolves.toEqual({
      linkedArtifacts: [],
      ruleApplications: [],
    });
    await expect(result.outputChunks).resolves.toEqual([]);
    await expect(result.runHistory).resolves.toEqual({
      planRunAuditRows: [],
      recentPlanRuns: [],
    });
    await expect(result.tagVocabulary).resolves.toEqual([]);
    await expect(result.workspaceRepositories).resolves.toEqual([]);
  });

  test('awaits only the critical query and returns the rest as promises', async () => {
    mockDocuments();

    const result = await callLoader();

    // plan + tasks are resolved values by the time the loader returns.
    expect(result.plan).toEqual(plan);
    expect(result.tasks).toEqual(tasks);

    // Everything else is still in flight.
    expect(result.ledger).toBeInstanceOf(Promise);
    expect(result.outputChunks).toBeInstanceOf(Promise);
    expect(result.runHistory).toBeInstanceOf(Promise);
    expect(result.tagVocabulary).toBeInstanceOf(Promise);
    expect(result.workspaceRepositories).toBeInstanceOf(Promise);
  });

  test('issues one query per document, including the critical one', async () => {
    mockDocuments();

    await callLoader();

    const documents = mockExecuteGraphqlWithAuth.mock.calls.map(
      (call) => call[1],
    );
    expect(documents).toContain(PlanDetailCriticalDocument);
    expect(documents).toContain(PlanDetailLedgerDocument);
    expect(documents).toContain(PlanDetailOutputChunksDocument);
    expect(documents).toContain(PlanDetailRunHistoryDocument);
    expect(documents).toContain(PlanDetailTagVocabularyDocument);
    expect(documents).toContain(PlanDetailWorkspaceRepositoriesDocument);
  });

  test('maps each deferred promise to the shape its consumer expects', async () => {
    mockDocuments();

    const result = await callLoader();

    await expect(result.ledger).resolves.toEqual({
      linkedArtifacts,
      ruleApplications,
    });
    await expect(result.outputChunks).resolves.toEqual(outputChunks);
    await expect(result.runHistory).resolves.toEqual({
      planRunAuditRows: auditRows,
      recentPlanRuns: recentRuns,
    });
    await expect(result.tagVocabulary).resolves.toEqual(vocabularyTags);
    await expect(result.workspaceRepositories).resolves.toEqual(repositories);
  });

  test('coalesces nullish collections to empty arrays and a null plan', async () => {
    mockDocuments(
      new Map<unknown, unknown>([
        [PlanDetailCriticalDocument, { plan: null, tasksByPlanId: null }],
        [
          PlanDetailLedgerDocument,
          {
            ruleApplications: null,
            workArtifactsByPlan: { artifacts: null, totalCount: 0 },
          },
        ],
        [PlanDetailOutputChunksDocument, { planOutputStreamChunks: null }],
        [
          PlanDetailRunHistoryDocument,
          {
            metrics: { recentPlanRunsMetrics: null },
            planRunsByPlanId: null,
          },
        ],
        [
          PlanDetailTagVocabularyDocument,
          { skillTagVocabulary: { tags: null, totalCount: 0 } },
        ],
        [
          PlanDetailWorkspaceRepositoriesDocument,
          { workspaceRepositories: null },
        ],
      ]),
    );

    const result = await callLoader();

    expect(result.plan).toBeNull();
    expect(result.tasks).toEqual([]);
    await expect(result.ledger).resolves.toEqual({
      linkedArtifacts: [],
      ruleApplications: [],
    });
    await expect(result.outputChunks).resolves.toEqual([]);
    await expect(result.runHistory).resolves.toEqual({
      planRunAuditRows: [],
      recentPlanRuns: [],
    });
    await expect(result.tagVocabulary).resolves.toEqual([]);
    await expect(result.workspaceRepositories).resolves.toEqual([]);
  });

  test('a rejected workspaceRepositories does not make the loader throw', async () => {
    const failure = new Error('inspection scan failed');
    mockDocuments(
      new Map<unknown, unknown>([
        [PlanDetailWorkspaceRepositoriesDocument, failure],
      ]),
    );

    // The whole point of the split: this used to 500 the entire plan page.
    const result = await callLoader();

    expect(result.plan).toEqual(plan);
    expect(result.tasks).toEqual(tasks);
    await expect(result.workspaceRepositories).rejects.toThrow(
      'inspection scan failed',
    );

    // The sibling regions are unaffected by their neighbour's failure.
    await expect(result.outputChunks).resolves.toEqual(outputChunks);
  });

  test('a rejected critical query still throws, because the shell needs it', async () => {
    mockDocuments(
      new Map<unknown, unknown>([
        [PlanDetailCriticalDocument, new Error('plan read failed')],
      ]),
    );

    await expect(callLoader()).rejects.toThrow('plan read failed');
  });

  // enabledEditors is deferred too, but loadEnabledEditors keeps its own catch,
  // so a workspace-settings failure degrades that region to no editors instead
  // of rejecting — the toolbar simply renders no deep links.
  test('degrades to no editors when the workspace-settings query fails', async () => {
    mockDocuments(
      new Map<unknown, unknown>([
        [
          PlanDetailWorkspaceEditorsDocument,
          new Error('workspace settings unavailable'),
        ],
      ]),
    );

    const result = await callLoader();

    await expect(result.enabledEditors).resolves.toEqual([]);
    expect(result.plan).toEqual(plan);
  });
});
