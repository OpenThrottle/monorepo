import { cn } from '@openthrottle/react-router-shadcn';
import {
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GitCompareIcon } from 'lucide-react';
import * as React from 'react';

import type { EvalRunComparisonRouteQuery } from '~/__generated__/graphql';
import { EvalCompareHeadline } from '~/routing/evals/components/EvalCompareHeadline';
import { EvalCompareVerdict } from '~/routing/evals/components/EvalCompareVerdict';
import { EvalRegressionsTable } from '~/routing/evals/components/EvalRegressionsTable';
import { EVAL_COMPARE_COPY } from '~/routing/evals/data/data.copy';

export interface EvalCompareRouteProps {
  readonly className?: string;
  readonly comparison: EvalRunComparisonRouteQuery['evalRunComparison'];
}

/**
 * @description The compare page body: the verdict (McNemar in plain words and
 * the warnings), the numbers side by side, the cases that got worse first and
 * then the cases that got better.
 */
export const EvalCompareRoute = (
  props: EvalCompareRouteProps,
): React.ReactElement => {
  const { className, comparison } = props;
  const { base, candidate } = comparison;

  // Hooks

  // Setup
  const copy = EVAL_COMPARE_COPY;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen
      className={cn('flex w-full flex-col gap-6 p-4 md:p-8 lg:p-12', className)}
    >
      <GlobalHeading
        heading="h1"
        icon={GitCompareIcon}
        title={copy.pageTitle}
      />
      <div className="flex flex-col gap-6" data-testid="EvalCompareRoute">
        <EvalCompareVerdict
          mcnemar={comparison.mcnemar}
          sharedCases={comparison.sharedCases}
          warnings={comparison.warnings}
        />
        <EvalRegressionsTable
          baseCases={base.cases}
          candidateCases={candidate.cases}
          caseIds={comparison.regressedCaseIds}
          emptyText={copy.regressedEmpty}
          heading={copy.regressedHeading}
        />
        <EvalCompareHeadline base={base} candidate={candidate} />
        <EvalRegressionsTable
          baseCases={base.cases}
          candidateCases={candidate.cases}
          caseIds={comparison.improvedCaseIds}
          emptyText={copy.improvedEmpty}
          heading={copy.improvedHeading}
        />
      </div>
    </GlobalScreen>
  );
};
