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
  caseResultRank,
  describeCaseResult,
  shortId,
} from '~/routing/evals/utils/report-format';

export interface EvalCasesTableProps {
  readonly cases: EvalRunReportFieldsFragment['cases'];
  readonly className?: string;
}

/**
 * @description One row per case: split, counted attempts that passed, and the
 * case result (every counted attempt passed). Failed cases sort first.
 */
export const EvalCasesTable = (
  props: EvalCasesTableProps,
): React.ReactElement => {
  const { cases, className } = props;

  // Hooks

  // Setup
  const copy = EVAL_REPORT_COPY;
  const columns = copy.casesColumns;
  const rows = [...cases].sort((a, b) => {
    return caseResultRank(a.passed) - caseResultRank(b.passed);
  });

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-labelledby="eval-cases-heading"
      className={cn('flex flex-col gap-2', className)}
      data-testid="EvalCasesTable"
    >
      <h2 className="text-sm font-medium" id="eval-cases-heading">
        {copy.casesHeading}
      </h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{columns.case}</TableHead>
            <TableHead>{columns.split}</TableHead>
            <TableHead>{columns.attempts}</TableHead>
            <TableHead>{columns.result}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            return (
              <TableRow key={row.caseId}>
                <TableCell className="font-mono" title={row.caseId}>
                  {shortId(row.caseId)}
                </TableCell>
                <TableCell>{row.split}</TableCell>
                <TableCell className="tabular-nums">
                  {row.attemptsPassed} / {row.attemptsCounted}
                </TableCell>
                <TableCell>
                  <Badge color={describeCaseResult(row.passed).color}>
                    {describeCaseResult(row.passed).label}
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
