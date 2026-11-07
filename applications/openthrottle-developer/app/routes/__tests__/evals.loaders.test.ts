// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route as IndexRoute } from '@/app/routes/+types/evals._index';
import type { Route as CompareRoute } from '@/app/routes/+types/evals.compare';
import type { Route as ReportRoute } from '@/app/routes/+types/evals.runs.$runId';

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
  EvalRunComparisonRouteDocument,
  EvalRunReportRouteDocument,
  EvalRunReportSiblingsDocument,
  EvalsIndexDatasetsDocument,
  EvalsIndexRepositoriesDocument,
  EvalsIndexRunsDocument,
} = await import('~/__generated__/graphql');
const { MOCK_REPORT_BASE, MOCK_REPORT_CANDIDATE, MOCK_RUN_ROW } =
  await import('~/routing/evals/data/mock.eval-report');
const compare = await import('../evals.compare');
const index = await import('../evals._index');
const report = await import('../evals.runs.$runId');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

type ExecuteResult = Awaited<ReturnType<typeof executeGraphqlWithAuth>>;

const result = (value: unknown): ExecuteResult => {
  return asMock<ExecuteResult>(value);
};

const indexArgs = (query = ''): IndexRoute.LoaderArgs => {
  const request = new Request(`http://localhost/evals${query}`);

  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/evals',
    request,
    url: new URL(request.url),
  };
};

const compareArgs = (query: string): CompareRoute.LoaderArgs => {
  const request = new Request(`http://localhost/evals/compare${query}`);

  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/evals/compare',
    request,
    url: new URL(request.url),
  };
};

const reportArgs = (): ReportRoute.LoaderArgs => {
  const request = new Request('http://localhost/evals/runs/run-base');

  return {
    context: createTestRouterContext(),
    params: { runId: 'run-base' },
    pattern: '/evals/runs/:runId',
    request,
    url: new URL(request.url),
  };
};

const statusOf = async (promise: Promise<unknown>): Promise<number> => {
  const thrown: unknown = await promise.then(
    () => null,
    (error: unknown) => error,
  );

  return thrown instanceof Response ? thrown.status : 0;
};

describe('evals routes behind FEATURE_DELTA_PREVIEW', () => {
  beforeEach(() => {
    flags.delta = true;
    mockExecute.mockReset();
  });

  describe('when the flag is off', () => {
    test('every loader 404s without querying', async () => {
      flags.delta = false;

      expect(await statusOf(index.loader(indexArgs()))).toBe(404);
      expect(await statusOf(report.loader(reportArgs()))).toBe(404);
      expect(
        await statusOf(compare.loader(compareArgs('?base=a&candidate=b'))),
      ).toBe(404);
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  describe('evals._index loader', () => {
    const workspace = result({
      workspaceRepositories: [{ id: 'repo-1', name: 'monorepo' }],
    });

    test('lists repositories until a known one is picked', async () => {
      mockExecute.mockResolvedValue(workspace);

      const data = await index.loader(indexArgs('?repositoryId=nope'));

      expect(data.selectedRepositoryId).toBeNull();
      expect(data.datasets).toBeNull();
      expect(data.repositories).toEqual([
        { displayName: 'monorepo', id: 'repo-1' },
      ]);
    });

    test('loads the datasets of the picked repository with their runs', async () => {
      mockExecute.mockImplementation(async (_request, document) => {
        if (document === EvalsIndexRepositoriesDocument) {
          return workspace;
        }

        if (document === EvalsIndexDatasetsDocument) {
          return result({
            evalDatasets: [
              {
                createdAt: '2026-11-06',
                id: 'dataset-1',
                name: 'plan-failures',
                target: 'plan_task',
                version: 2,
              },
            ],
          });
        }

        expect(document).toBe(EvalsIndexRunsDocument);

        return result({ evalRuns: [MOCK_RUN_ROW] });
      });

      const data = await index.loader(indexArgs('?repositoryId=repo-1'));

      expect(data.selectedRepositoryId).toBe('repo-1');
      expect(data.datasets).toEqual([
        {
          id: 'dataset-1',
          name: 'plan-failures',
          runs: [MOCK_RUN_ROW],
          version: 2,
        },
      ]);
    });
  });

  describe('evals.runs.$runId loader', () => {
    test('returns the report and the other runs of its dataset', async () => {
      mockExecute.mockImplementation(async (_request, document) => {
        if (document === EvalRunReportRouteDocument) {
          return result({ evalRunReport: MOCK_REPORT_BASE });
        }

        expect(document).toBe(EvalRunReportSiblingsDocument);

        return result({ evalRuns: [MOCK_RUN_ROW] });
      });

      const data = await report.loader(reportArgs());

      expect(data.report).toEqual(MOCK_REPORT_BASE);
      expect(data.siblings).toEqual([MOCK_RUN_ROW]);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.anything(),
        EvalRunReportSiblingsDocument,
        { datasetId: 'dataset-1' },
      );
    });
  });

  describe('evals.compare loader', () => {
    test('400s when a run is missing', async () => {
      expect(await statusOf(compare.loader(compareArgs('?base=a')))).toBe(400);
      expect(mockExecute).not.toHaveBeenCalled();
    });

    test('asks for the comparison of the two runs', async () => {
      const comparison = {
        base: MOCK_REPORT_BASE,
        candidate: MOCK_REPORT_CANDIDATE,
        improvedCaseIds: [],
        mcnemar: null,
        regressedCaseIds: [],
        sharedCases: 0,
        warnings: [],
      };

      mockExecute.mockResolvedValue(result({ evalRunComparison: comparison }));

      const data = await compare.loader(
        compareArgs('?base=run-base&candidate=run-candidate'),
      );

      expect(data.comparison).toEqual(comparison);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.anything(),
        EvalRunComparisonRouteDocument,
        { baseRunId: 'run-base', candidateRunId: 'run-candidate' },
      );
    });
  });
});
