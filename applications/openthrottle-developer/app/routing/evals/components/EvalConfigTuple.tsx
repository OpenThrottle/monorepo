import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { EvalRunReportFieldsFragment } from '~/__generated__/graphql';
import { EVAL_REPORT_COPY } from '~/routing/evals/data/data.copy';
import { formatEvalTimestamp } from '~/routing/evals/utils/report-format';

export interface EvalConfigTupleProps {
  readonly className?: string;
  readonly datasetName: string;
  readonly run: EvalRunReportFieldsFragment['run'];
}

/**
 * @description The run's full configuration tuple: driver, model, effort,
 * prompt and skill SHAs, auth mode, dataset and version, k, budgets and timing.
 * Grader versions are in the graders table beside it.
 */
export const EvalConfigTuple = (
  props: EvalConfigTupleProps,
): React.ReactElement => {
  const { className, datasetName, run } = props;

  // Hooks

  // Setup
  const labels = EVAL_REPORT_COPY.configLabels;
  const notSet = EVAL_REPORT_COPY.notSet;
  const unlimited = EVAL_REPORT_COPY.unlimited;
  const budgetUsd = run.budgetUsd == null ? unlimited : `$${run.budgetUsd}`;
  const budgetTokens = run.budgetTokens ?? unlimited;
  const rows = [
    { label: labels.driver, value: run.driver },
    { label: labels.model, value: run.model ?? notSet },
    { label: labels.effort, value: run.effort ?? notSet },
    { label: labels.promptSha, value: run.promptSha ?? notSet },
    { label: labels.skillSha, value: run.skillSha ?? notSet },
    { label: labels.authMode, value: run.authMode },
    { label: labels.dataset, value: `${datasetName} v${run.datasetVersion}` },
    { label: labels.k, value: String(run.k) },
    { label: labels.status, value: run.status },
    { label: labels.budget, value: `${budgetUsd} · ${budgetTokens}` },
    { label: labels.started, value: formatEvalTimestamp(run.startedAt) },
    { label: labels.finished, value: formatEvalTimestamp(run.finishedAt) },
  ];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-labelledby="eval-config-heading"
      className={cn('flex flex-col gap-2', className)}
      data-testid="EvalConfigTuple"
    >
      <h2 className="text-sm font-medium" id="eval-config-heading">
        {EVAL_REPORT_COPY.configHeading}
      </h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          return (
            <div className="flex flex-col" key={row.label}>
              <dt className="text-muted-foreground text-xs">{row.label}</dt>
              <dd className="font-mono break-all">{row.value}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
};
