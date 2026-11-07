import {
  Alert,
  AlertDescription,
  AlertTitle,
  cn,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { EVAL_COMPARE_COPY } from '~/routing/evals/data/data.copy';
import { describeMcNemar } from '~/routing/evals/utils/report-format';

export interface EvalCompareVerdictProps {
  readonly className?: string;
  readonly mcnemar:
    | {
        readonly b: number;
        readonly c: number;
        readonly pValue: number;
      }
    | null
    | undefined;
  readonly sharedCases: number;
  readonly warnings: readonly {
    readonly code: string;
    readonly message: string;
  }[];
}

/**
 * @description McNemar's result in plain words, how many cases it rests on, and
 * the comparability warnings (different dataset, auth mode or k) shown loudly.
 */
export const EvalCompareVerdict = (
  props: EvalCompareVerdictProps,
): React.ReactElement => {
  const { className, mcnemar, sharedCases, warnings } = props;

  // Hooks

  // Setup
  const copy = EVAL_COMPARE_COPY;
  const sentence = mcnemar ? describeMcNemar(mcnemar) : copy.noShared;

  const hasWarnings = warnings.length > 0;

  // Handlers

  // Markup
  const warningAlert = (
    <Alert role="alert" variant="destructive">
      <AlertTitle>{copy.warningsHeading}</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4">
          {warnings.map((warning) => {
            return <li key={warning.code}>{warning.message}</li>;
          })}
        </ul>
      </AlertDescription>
    </Alert>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-labelledby="eval-verdict-heading"
      className={cn('flex flex-col gap-3', className)}
      data-testid="EvalCompareVerdict"
    >
      <h2 className="text-sm font-medium" id="eval-verdict-heading">
        {copy.verdictHeading}
      </h2>
      <p className="text-lg font-medium">{sentence}</p>
      <p className="text-muted-foreground text-xs">
        {sharedCases} {copy.sharedCases}
      </p>
      {hasWarnings ? warningAlert : null}
    </section>
  );
};
