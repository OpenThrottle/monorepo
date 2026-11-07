import { cn } from '@openthrottle/react-router-shadcn';
import {
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { ClipboardCheckIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import type {
  EvalRunListRowFragment,
  EvalRunReportFieldsFragment,
} from '~/__generated__/graphql';
import { EvalCasesTable } from '~/routing/evals/components/EvalCasesTable';
import { EvalConfigTuple } from '~/routing/evals/components/EvalConfigTuple';
import { EvalGradersTable } from '~/routing/evals/components/EvalGradersTable';
import { EvalHeadlineNumbers } from '~/routing/evals/components/EvalHeadlineNumbers';
import { EVAL_REPORT_COPY } from '~/routing/evals/data/data.copy';
import {
  describeRunConfig,
  formatEvalTimestamp,
} from '~/routing/evals/utils/report-format';

export interface EvalRunReportRouteProps {
  readonly className?: string;
  readonly report: EvalRunReportFieldsFragment;
  /** The other runs of the same dataset, offered as baselines. */
  readonly siblings: readonly EvalRunListRowFragment[];
}

/**
 * @description One run's report: the headline numbers, how many trials were left
 * out and why, the config tuple, the graders, the cases, and links to compare
 * this run against another run of the dataset.
 */
export const EvalRunReportRoute = (
  props: EvalRunReportRouteProps,
): React.ReactElement => {
  const { className, report, siblings } = props;

  // Hooks

  // Setup
  const copy = EVAL_REPORT_COPY;
  const { excluded, trialsExcluded } = report.numbers;
  const reasons = [
    { count: excluded.usageLimited, label: copy.excludedReasons.usageLimited },
    { count: excluded.errored, label: copy.excludedReasons.errored },
    { count: excluded.gradeError, label: copy.excludedReasons.gradeError },
    {
      count: excluded.noCountedGrade,
      label: copy.excludedReasons.noCountedGrade,
    },
  ].filter((reason) => {
    return reason.count > 0;
  });
  const baselines = siblings.filter((sibling) => {
    return sibling.id !== report.run.id;
  });

  const hasBaselines = baselines.length > 0;

  // Handlers

  // Markup
  const excludedNote = (
    <p className="text-muted-foreground text-sm" data-testid="EvalExcluded">
      {copy.excludedHeading}: {trialsExcluded} (
      {reasons
        .map((reason) => {
          return `${reason.count} ${reason.label}`;
        })
        .join(', ')}
      )
    </p>
  );
  const baselineList = (
    <ul className="flex flex-col gap-1 text-sm">
      {baselines.map((sibling) => {
        return (
          <li key={sibling.id}>
            <Link
              className="underline-offset-4 hover:underline"
              to={`/evals/compare?base=${sibling.id}&candidate=${report.run.id}`}
            >
              {copy.compareLink} {describeRunConfig(sibling)} ·{' '}
              {formatEvalTimestamp(sibling.createdAt)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
  const noBaselines = (
    <p className="text-muted-foreground text-sm">{copy.compareNone}</p>
  );
  const compare = (
    <section
      aria-labelledby="eval-compare-heading"
      className="flex flex-col gap-2"
    >
      <h2 className="text-sm font-medium" id="eval-compare-heading">
        {copy.compareHeading}
      </h2>
      <p className="text-muted-foreground text-xs">{copy.compareHint}</p>
      {hasBaselines ? baselineList : noBaselines}
    </section>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen
      className={cn('flex w-full flex-col gap-6 p-4 md:p-8 lg:p-12', className)}
    >
      <GlobalHeading
        heading="h1"
        icon={ClipboardCheckIcon}
        title={describeRunConfig(report.run)}
      />
      <div className="flex flex-col gap-6" data-testid="EvalRunReportRoute">
        <EvalHeadlineNumbers numbers={report.numbers} />
        {trialsExcluded > 0 ? excludedNote : null}
        <EvalConfigTuple datasetName={report.datasetName} run={report.run} />
        <EvalGradersTable graders={report.graders} />
        <EvalCasesTable cases={report.cases} />
        {compare}
      </div>
    </GlobalScreen>
  );
};
