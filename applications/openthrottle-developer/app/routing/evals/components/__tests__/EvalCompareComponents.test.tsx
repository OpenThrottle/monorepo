import { within } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { EvalCompareHeadline } from '~/routing/evals/components/EvalCompareHeadline';
import { EvalCompareRoute } from '~/routing/evals/components/EvalCompareRoute';
import { EvalCompareVerdict } from '~/routing/evals/components/EvalCompareVerdict';
import { EvalRegressionsTable } from '~/routing/evals/components/EvalRegressionsTable';
import { EvalRunReportRoute } from '~/routing/evals/components/EvalRunReportRoute';
import { EvalRunsRoute } from '~/routing/evals/components/EvalRunsRoute';
import {
  EVAL_COMPARE_COPY,
  EVAL_REPORT_COPY,
  EVAL_RUNS_COPY,
} from '~/routing/evals/data/data.copy';
import {
  MOCK_REPORT_BASE,
  MOCK_REPORT_CANDIDATE,
  MOCK_RUN_ROW,
} from '~/routing/evals/data/mock.eval-report';
import { renderEvals } from '~/routing/evals/testing/renderEvals';

describe('EvalCompareVerdict', () => {
  test('says what McNemar found in plain words', () => {
    const component = renderEvals(
      <EvalCompareVerdict
        mcnemar={{ b: 3, c: 1, pValue: 0.62 }}
        sharedCases={12}
        warnings={[]}
      />,
    );

    expect(
      component.getByText(
        `3 cases got worse, 1 got better, p = 0.62 — ${EVAL_COMPARE_COPY.notSignificant}`,
      ),
    ).toBeInTheDocument();
    expect(component.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('calls a small p-value significant', () => {
    const component = renderEvals(
      <EvalCompareVerdict
        mcnemar={{ b: 9, c: 0, pValue: 0.004 }}
        sharedCases={30}
        warnings={[]}
      />,
    );

    expect(
      component.getByText(
        /9 cases got worse, 0 got better.*significant at this size/,
      ),
    ).toBeInTheDocument();
  });

  test('says there is nothing to test without shared cases', () => {
    const component = renderEvals(
      <EvalCompareVerdict mcnemar={null} sharedCases={0} warnings={[]} />,
    );

    expect(component.getByText(EVAL_COMPARE_COPY.noShared)).toBeInTheDocument();
  });

  test('shows every warning in an alert', () => {
    const component = renderEvals(
      <EvalCompareVerdict
        mcnemar={{ b: 0, c: 0, pValue: 1 }}
        sharedCases={3}
        warnings={[
          { code: 'dataset_differs', message: 'Different datasets.' },
          { code: 'k_differs', message: 'Different k.' },
        ]}
      />,
    );
    const alert = component.getByRole('alert');

    expect(within(alert).getByText('Different datasets.')).toBeInTheDocument();
    expect(within(alert).getByText('Different k.')).toBeInTheDocument();
  });
});

describe('EvalRegressionsTable', () => {
  test('lists the changed cases with both runs attempts', () => {
    const component = renderEvals(
      <EvalRegressionsTable
        baseCases={MOCK_REPORT_BASE.cases}
        candidateCases={MOCK_REPORT_CANDIDATE.cases}
        caseIds={['case-aaaaaaaa-1']}
        emptyText="none"
        heading={EVAL_COMPARE_COPY.regressedHeading}
      />,
    );
    const row = component.getByText('case-aaa').closest('tr');

    expect(row).not.toBeNull();
    expect(component.getByText('3 / 3')).toBeInTheDocument();
    expect(component.getByText('1 / 3')).toBeInTheDocument();
  });

  test('shows the empty text with no cases', () => {
    const component = renderEvals(
      <EvalRegressionsTable
        baseCases={[]}
        candidateCases={[]}
        caseIds={[]}
        emptyText="none"
        heading={EVAL_COMPARE_COPY.improvedHeading}
      />,
    );

    expect(component.getByText('none')).toBeInTheDocument();
    expect(component.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('EvalCompareHeadline', () => {
  test('links each run to its report and shows both pass rates', () => {
    const component = renderEvals(
      <EvalCompareHeadline
        base={MOCK_REPORT_BASE}
        candidate={MOCK_REPORT_CANDIDATE}
      />,
    );

    expect(
      component.getByRole('link', { name: 'claude · opus · high' }),
    ).toHaveAttribute('href', '/evals/runs/run-base');
    expect(
      component.getByRole('link', { name: 'claude · sonnet · high' }),
    ).toHaveAttribute('href', '/evals/runs/run-candidate');
    // pass rate and pass^k, for each of the two runs
    expect(component.getAllByText(/67%/)).toHaveLength(4);
  });
});

describe('EvalCompareRoute', () => {
  test('puts the regressed cases before the improved ones', () => {
    const component = renderEvals(
      <EvalCompareRoute
        comparison={{
          base: MOCK_REPORT_BASE,
          candidate: MOCK_REPORT_CANDIDATE,
          improvedCaseIds: ['case-bbbbbbbb-2'],
          mcnemar: { b: 1, c: 1, method: 'exact', pValue: 1 },
          regressedCaseIds: ['case-aaaaaaaa-1'],
          sharedCases: 3,
          warnings: [],
        }}
      />,
    );
    const headings = component
      .getAllByRole('heading', { level: 2 })
      .map((heading) => {
        return heading.textContent;
      });
    const worse = headings.findIndex((text) => {
      return text?.startsWith(EVAL_COMPARE_COPY.regressedHeading) === true;
    });
    const better = headings.findIndex((text) => {
      return text?.startsWith(EVAL_COMPARE_COPY.improvedHeading) === true;
    });

    expect(worse).toBeGreaterThanOrEqual(0);
    expect(worse).toBeLessThan(better);
  });
});

describe('EvalRunReportRoute', () => {
  test('shows the sections and offers sibling runs as baselines', () => {
    const sibling = { ...MOCK_RUN_ROW, id: 'run-other', model: 'haiku' };
    const component = renderEvals(
      <EvalRunReportRoute
        report={MOCK_REPORT_CANDIDATE}
        siblings={[MOCK_RUN_ROW, sibling]}
      />,
    );

    expect(component.getByTestId('EvalHeadlineNumbers')).toBeInTheDocument();
    expect(component.getByTestId('EvalConfigTuple')).toBeInTheDocument();
    expect(component.getByTestId('EvalGradersTable')).toBeInTheDocument();
    expect(component.getByTestId('EvalCasesTable')).toBeInTheDocument();
    expect(component.getByTestId('EvalExcluded')).toHaveTextContent(
      EVAL_REPORT_COPY.excludedReasons.usageLimited,
    );
    expect(
      component.getByRole('link', { name: /Compare against claude · haiku/ }),
    ).toHaveAttribute(
      'href',
      '/evals/compare?base=run-other&candidate=run-candidate',
    );
    expect(
      component.getAllByRole('link', { name: /Compare against/ }),
    ).toHaveLength(2);
  });

  test('says there is nothing to compare with when the run is alone', () => {
    const component = renderEvals(
      <EvalRunReportRoute report={MOCK_REPORT_CANDIDATE} siblings={[]} />,
    );

    expect(
      component.getByText(EVAL_REPORT_COPY.compareNone),
    ).toBeInTheDocument();
  });
});

describe('EvalRunsRoute', () => {
  test('lists repositories to pick from when none is selected', () => {
    const component = renderEvals(
      <EvalRunsRoute
        datasets={null}
        repositories={[{ displayName: 'monorepo', id: 'repo-1' }]}
        selectedRepositoryId={null}
      />,
    );

    expect(component.getByRole('link', { name: 'monorepo' })).toHaveAttribute(
      'href',
      '/evals?repositoryId=repo-1',
    );
  });

  test('lists a dataset with its runs and links each report', () => {
    const component = renderEvals(
      <EvalRunsRoute
        datasets={[
          {
            id: 'dataset-1',
            name: 'plan-failures',
            runs: [MOCK_RUN_ROW],
            version: 2,
          },
          { id: 'dataset-2', name: 'empty-set', runs: [], version: 1 },
        ]}
        repositories={[]}
        selectedRepositoryId="repo-1"
      />,
    );

    expect(
      component.getByRole('link', { name: EVAL_RUNS_COPY.openReport }),
    ).toHaveAttribute('href', '/evals/runs/run-base');
    expect(component.getByText(EVAL_RUNS_COPY.emptyRuns)).toBeInTheDocument();
  });

  test('says when the repository has no datasets', () => {
    const component = renderEvals(
      <EvalRunsRoute
        datasets={[]}
        repositories={[]}
        selectedRepositoryId="repo-1"
      />,
    );

    expect(
      component.getByText(EVAL_RUNS_COPY.emptyDatasets),
    ).toBeInTheDocument();
  });
});
