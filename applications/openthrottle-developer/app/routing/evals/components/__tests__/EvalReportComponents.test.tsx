import { within } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { EvalCasesTable } from '~/routing/evals/components/EvalCasesTable';
import { EvalConfigTuple } from '~/routing/evals/components/EvalConfigTuple';
import { EvalGradersTable } from '~/routing/evals/components/EvalGradersTable';
import { EvalHeadlineNumbers } from '~/routing/evals/components/EvalHeadlineNumbers';
import { EvalStat } from '~/routing/evals/components/EvalStat';
import {
  EVAL_REPORT_COPY,
  EVAL_STAT_COPY,
} from '~/routing/evals/data/data.copy';
import { MOCK_REPORT_BASE } from '~/routing/evals/data/mock.eval-report';
import { renderEvals } from '~/routing/evals/testing/render-evals';

describe('EvalStat', () => {
  test('shows the label, value and detail', () => {
    const component = renderEvals(
      <EvalStat detail="6/9" hint="hint" label="Pass rate" value="67%" />,
    );

    expect(component.getByText('Pass rate')).toBeInTheDocument();
    expect(component.getByText('67%')).toBeInTheDocument();
    expect(component.getByText('6/9')).toBeInTheDocument();
  });
});

describe('EvalHeadlineNumbers', () => {
  test('shows the four headline numbers and pass^k', () => {
    const component = renderEvals(
      <EvalHeadlineNumbers numbers={MOCK_REPORT_BASE.numbers} />,
    );
    const section = component.getByTestId('EvalHeadlineNumbers');

    expect(
      within(section).getByText(EVAL_STAT_COPY.passRate),
    ).toBeInTheDocument();
    // pass rate and pass^k are both 0.67 in the fixture
    expect(within(section).getAllByText('67%')).toHaveLength(2);
    expect(within(section).getByText('0.72')).toBeInTheDocument();
    expect(within(section).getByText('± 28 points')).toBeInTheDocument();
    expect(within(section).getByText('$1.50')).toBeInTheDocument();
    expect(
      within(section).getByText(EVAL_STAT_COPY.passHatK),
    ).toBeInTheDocument();
  });

  test('reads a null cost per success as unpriced, never zero', () => {
    const numbers = { ...MOCK_REPORT_BASE.numbers, costPerSuccessUsd: null };
    const component = renderEvals(<EvalHeadlineNumbers numbers={numbers} />);

    expect(component.getByText(EVAL_STAT_COPY.unpriced)).toBeInTheDocument();
  });

  test('says when no judge is calibrated', () => {
    const numbers = { ...MOCK_REPORT_BASE.numbers, judgeAgreement: null };
    const component = renderEvals(<EvalHeadlineNumbers numbers={numbers} />);

    expect(
      component.getByText(EVAL_STAT_COPY.judgeAgreementNone),
    ).toBeInTheDocument();
  });
});

describe('EvalConfigTuple', () => {
  test('lists the driver, model, effort, SHAs, dataset version and k', () => {
    const component = renderEvals(
      <EvalConfigTuple
        datasetName={MOCK_REPORT_BASE.datasetName}
        run={MOCK_REPORT_BASE.run}
      />,
    );

    expect(component.getByText('claude')).toBeInTheDocument();
    expect(component.getByText('opus')).toBeInTheDocument();
    expect(component.getByText('high')).toBeInTheDocument();
    expect(component.getByText('a1b2c3d4e5f6')).toBeInTheDocument();
    expect(component.getByText('plan-failures v2')).toBeInTheDocument();
    expect(
      component.getByText(EVAL_REPORT_COPY.configLabels.skillSha),
    ).toBeInTheDocument();
    expect(component.getByText(EVAL_REPORT_COPY.notSet)).toBeInTheDocument();
  });
});

const rowOf = (element: HTMLElement): HTMLElement => {
  const row = element.closest('tr');

  if (row === null) {
    throw new Error('Expected the element to be inside a table row');
  }

  return row;
};

describe('EvalGradersTable', () => {
  test('marks which graders count and shows calibration', () => {
    const component = renderEvals(
      <EvalGradersTable graders={MOCK_REPORT_BASE.graders} />,
    );
    const human = rowOf(component.getByText('reviewer'));
    const judge = rowOf(component.getByText('follows-plan'));

    expect(
      within(human).getByText(EVAL_REPORT_COPY.gradersCountsNo),
    ).toBeInTheDocument();
    expect(
      within(judge).getByText(EVAL_REPORT_COPY.gradersCountsYes),
    ).toBeInTheDocument();
    expect(within(judge).getByText('gating')).toBeInTheDocument();
    expect(within(judge).getByText('0.72')).toBeInTheDocument();
  });
});

describe('EvalCasesTable', () => {
  test('lists failed cases first with passed / counted attempts', () => {
    const component = renderEvals(
      <EvalCasesTable cases={MOCK_REPORT_BASE.cases} />,
    );
    const failed = rowOf(component.getByText('0 / 3'));
    const [, firstBody] = component.getAllByRole('row');

    expect(firstBody).toBe(failed);
    expect(
      within(failed).getByText(EVAL_REPORT_COPY.caseFailed),
    ).toBeInTheDocument();
    expect(component.getAllByText(EVAL_REPORT_COPY.casePassed)).toHaveLength(2);
  });
});
