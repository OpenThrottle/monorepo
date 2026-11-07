import {
  Badge,
  cn,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { EvalRunReportFieldsFragment } from '~/__generated__/graphql';
import { EVAL_REPORT_COPY } from '~/routing/evals/data/data.copy';
import {
  formatKappa,
  formatKappaInterval,
} from '~/routing/evals/utils/report-format';

export interface EvalGradersTableProps {
  readonly className?: string;
  readonly graders: EvalRunReportFieldsFragment['graders'];
}

/**
 * @description Every grader that graded the run, its version, judge model,
 * calibration and whether its grades count toward the pass rate. Version and
 * judge model drop below `lg` so the Counts column stays on screen at tablet
 * width.
 */
export const EvalGradersTable = (
  props: EvalGradersTableProps,
): React.ReactElement => {
  const { className, graders } = props;

  // Hooks

  // Setup
  const copy = EVAL_REPORT_COPY;
  const columns = copy.gradersColumns;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-labelledby="eval-graders-heading"
      className={cn('flex flex-col gap-2', className)}
      data-testid="EvalGradersTable"
    >
      <h2 className="text-sm font-medium" id="eval-graders-heading">
        {copy.gradersHeading}
      </h2>
      <p className="text-muted-foreground text-xs">{copy.gradersHint}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{columns.grader}</TableHead>
            <TableHead>{columns.kind}</TableHead>
            <TableHead className="max-lg:hidden">{columns.version}</TableHead>
            <TableHead className="max-lg:hidden">{columns.judge}</TableHead>
            <TableHead>{columns.kappa}</TableHead>
            <TableHead>{columns.calibration}</TableHead>
            <TableHead>{columns.counts}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {graders.map((grader) => {
            return (
              <TableRow
                key={`${grader.graderKind}-${grader.graderId}-${grader.graderVersion}`}
              >
                <TableCell className="font-mono">{grader.graderId}</TableCell>
                <TableCell>{grader.graderKind}</TableCell>
                <TableCell className="font-mono max-lg:hidden">
                  {grader.graderVersion}
                </TableCell>
                <TableCell className="max-lg:hidden">
                  {grader.judgeModel ?? copy.notSet}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatKappa(grader.kappa)}{' '}
                  <span className="text-muted-foreground text-xs">
                    {formatKappaInterval(grader.kappaCiLow, grader.kappaCiHigh)}
                  </span>
                </TableCell>
                <TableCell>{grader.calibrationStatus ?? copy.notSet}</TableCell>
                <TableCell>
                  <Badge color={grader.counts ? 'green' : 'slate'}>
                    {grader.counts
                      ? copy.gradersCountsYes
                      : copy.gradersCountsNo}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
};
