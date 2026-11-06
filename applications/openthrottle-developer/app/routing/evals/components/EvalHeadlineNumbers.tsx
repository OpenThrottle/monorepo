import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { EvalRunReportFieldsFragment } from '~/__generated__/graphql';
import { EvalStat } from '~/routing/evals/components/EvalStat';
import {
  EVAL_REPORT_COPY,
  EVAL_STAT_COPY,
} from '~/routing/evals/data/data.copy';
import {
  formatCostPerSuccess,
  formatDetectionFloor,
  formatKappa,
  formatKappaInterval,
  formatRate,
  formatRateInterval,
} from '~/routing/evals/utils/report-format';

export interface EvalHeadlineNumbersProps {
  readonly className?: string;
  readonly numbers: EvalRunReportFieldsFragment['numbers'];
}

/**
 * @description The headline numbers of a run: pass rate with its 95% interval,
 * judge agreement (kappa), detection floor, cost per success, and pass^k.
 */
export const EvalHeadlineNumbers = (
  props: EvalHeadlineNumbersProps,
): React.ReactElement => {
  const { className, numbers } = props;

  // Hooks

  // Setup
  const copy = EVAL_STAT_COPY;
  const agreement = numbers.judgeAgreement;
  const interval = formatRateInterval(numbers.passRateCi);
  const passDetail = `${numbers.trialsPassed}/${numbers.trialsCounted} ${interval}`;
  const kappaDetail = agreement
    ? `${agreement.graderId} ${formatKappaInterval(agreement.kappaCiLow, agreement.kappaCiHigh)}`
    : copy.judgeAgreementNone;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-label={EVAL_REPORT_COPY.headlineHeading}
      className={cn(
        'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5',
        className,
      )}
      data-testid="EvalHeadlineNumbers"
    >
      <EvalStat
        detail={passDetail}
        hint={copy.passRateHint}
        label={copy.passRate}
        value={formatRate(numbers.passRate)}
      />
      <EvalStat
        detail={kappaDetail}
        hint={copy.judgeAgreementHint}
        label={copy.judgeAgreement}
        value={formatKappa(agreement?.kappa)}
      />
      <EvalStat
        detail={`${numbers.casesCounted} ${EVAL_REPORT_COPY.headlineDetailCases}`}
        hint={copy.detectionFloorHint}
        label={copy.detectionFloor}
        value={formatDetectionFloor(numbers.detectionFloor)}
      />
      <EvalStat
        detail=""
        hint={copy.costPerSuccessHint}
        label={copy.costPerSuccess}
        value={formatCostPerSuccess(numbers.costPerSuccessUsd)}
      />
      <EvalStat
        detail={`${numbers.casesAtK} ${EVAL_REPORT_COPY.headlineDetailCases}`}
        hint={copy.passHatKHint}
        label={copy.passHatK}
        value={formatRate(numbers.passHatK)}
      />
    </section>
  );
};
