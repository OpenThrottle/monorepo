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
import { Link } from 'react-router';

import type { EvalRunReportFieldsFragment } from '~/__generated__/graphql';
import {
  EVAL_COMPARE_COPY,
  EVAL_REPORT_COPY,
  EVAL_STAT_COPY,
} from '~/routing/evals/data/data.copy';
import {
  describeRunConfig,
  formatCostPerSuccess,
  formatDetectionFloor,
  formatKappa,
  formatRate,
  formatRateInterval,
} from '~/routing/evals/utils/report-format';

export interface EvalCompareHeadlineProps {
  readonly base: EvalRunReportFieldsFragment;
  readonly candidate: EvalRunReportFieldsFragment;
  readonly className?: string;
}

/**
 * @description The headline numbers of the baseline and the candidate side by
 * side, under each run's configuration line (a link to its report).
 */
export const EvalCompareHeadline = (
  props: EvalCompareHeadlineProps,
): React.ReactElement => {
  const { base, candidate, className } = props;

  // Hooks

  // Setup
  const stat = EVAL_STAT_COPY;
  const metrics = [
    {
      format: (report: EvalRunReportFieldsFragment): string => {
        const interval = formatRateInterval(report.numbers.passRateCi);

        return `${formatRate(report.numbers.passRate)} ${interval}`;
      },
      label: stat.passRate,
    },
    {
      format: (report: EvalRunReportFieldsFragment): string => {
        return formatKappa(report.numbers.judgeAgreement?.kappa);
      },
      label: stat.judgeAgreement,
    },
    {
      format: (report: EvalRunReportFieldsFragment): string => {
        return formatDetectionFloor(report.numbers.detectionFloor);
      },
      label: stat.detectionFloor,
    },
    {
      format: (report: EvalRunReportFieldsFragment): string => {
        return formatCostPerSuccess(report.numbers.costPerSuccessUsd);
      },
      label: stat.costPerSuccess,
    },
    {
      format: (report: EvalRunReportFieldsFragment): string => {
        return formatRate(report.numbers.passHatK);
      },
      label: stat.passHatK,
    },
  ];

  // Handlers

  // Markup
  const runHeading = (
    label: string,
    report: EvalRunReportFieldsFragment,
  ): React.ReactElement => {
    return (
      <TableHead>
        <span className="text-muted-foreground block text-xs">{label}</span>
        <Link
          className="text-foreground underline-offset-4 hover:underline"
          to={`/evals/runs/${report.run.id}`}
        >
          {describeRunConfig(report.run)}
        </Link>
        <span className="text-muted-foreground block text-xs font-normal">
          {EVAL_REPORT_COPY.configLabels.dataset}: {report.datasetName} v
          {report.run.datasetVersion}
        </span>
      </TableHead>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-label={EVAL_REPORT_COPY.headlineHeading}
      className={cn('flex flex-col gap-2', className)}
      data-testid="EvalCompareHeadline"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{EVAL_COMPARE_COPY.metricColumn}</TableHead>
            {runHeading(EVAL_COMPARE_COPY.baseline, base)}
            {runHeading(EVAL_COMPARE_COPY.candidate, candidate)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {metrics.map((metric) => {
            return (
              <TableRow key={metric.label}>
                <TableCell className="text-muted-foreground">
                  {metric.label}
                </TableCell>
                <TableCell className="tabular-nums">
                  {metric.format(base)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {metric.format(candidate)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
};
