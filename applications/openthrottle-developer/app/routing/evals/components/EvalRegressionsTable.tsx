import {
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
import { EVAL_COMPARE_COPY } from '~/routing/evals/data/data.copy';
import { shortId } from '~/routing/evals/utils/report-format';

type EvalCaseRows = EvalRunReportFieldsFragment['cases'];

export interface EvalRegressionsTableProps {
  readonly baseCases: EvalCaseRows;
  readonly candidateCases: EvalCaseRows;
  readonly caseIds: readonly string[];
  readonly className?: string;
  readonly emptyText: string;
  readonly heading: string;
}

/**
 * @description A list of cases that changed between two runs (got worse or got
 * better), with each run's passed / counted attempts. Used twice by the
 * compare page: regressions first, then improvements.
 */
export const EvalRegressionsTable = (
  props: EvalRegressionsTableProps,
): React.ReactElement => {
  const { baseCases, candidateCases, caseIds, className, emptyText, heading } =
    props;

  // Hooks

  // Setup
  const columns = EVAL_COMPARE_COPY.regressionColumns;
  const attemptsFor = (cases: EvalCaseRows, caseId: string): string => {
    const found = cases.find((row) => {
      return row.caseId === caseId;
    });

    return found ? `${found.attemptsPassed} / ${found.attemptsCounted}` : '—';
  };
  const splitFor = (caseId: string): string => {
    const found = baseCases.find((row) => {
      return row.caseId === caseId;
    });

    return found?.split ?? '—';
  };

  const hasCases = caseIds.length > 0;

  // Handlers

  // Markup
  const empty = <p className="text-muted-foreground text-sm">{emptyText}</p>;
  const table = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{columns.case}</TableHead>
          <TableHead>{columns.split}</TableHead>
          <TableHead>{columns.base}</TableHead>
          <TableHead>{columns.candidate}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {caseIds.map((caseId) => {
          return (
            <TableRow key={caseId}>
              <TableCell className="font-mono" title={caseId}>
                {shortId(caseId)}
              </TableCell>
              <TableCell>{splitFor(caseId)}</TableCell>
              <TableCell className="tabular-nums">
                {attemptsFor(baseCases, caseId)}
              </TableCell>
              <TableCell className="tabular-nums">
                {attemptsFor(candidateCases, caseId)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-label={heading}
      className={cn('flex flex-col gap-2', className)}
      data-testid="EvalRegressionsTable"
    >
      <h2 className="text-sm font-medium">
        {heading} ({caseIds.length})
      </h2>
      {hasCases ? table : empty}
    </section>
  );
};
