/**
 * @description Resolver for eval reports: one run's report (config tuple, graders, headline
 * numbers, per-case rows) and a paired comparison of two runs. It only loads rows and hands them
 * to buildEvalReport and compareEvalReports in @openthrottle/agentic-evals, which own the trial
 * verdict rule and every statistic. See docs/openthrottle/eval-system-adr.md (Decisions 6 and 9).
 */

import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import {
  buildEvalReport,
  type ComparableConfig,
  compareEvalReports,
  type EvalReport,
  type ReportCalibration,
  type ReportGrade,
  type ReportTrial,
} from '@openthrottle/agentic-evals';
import {
  EvalDatasetsService,
  EvalJudgeCalibrationsService,
  EvalRunsService,
} from '@openthrottle/nestjs-repositories';

import { toEvalRunObject } from '../eval-runs/eval-run.mapper.ts';
import type { EvalRunObject } from '../eval-runs/eval-run.object.ts';
import {
  toEvalRunComparisonObject,
  toEvalRunReportObject,
} from './eval-reports.mapper.ts';
import { EvalRunComparisonObject } from './eval-run-comparison.object.ts';
import { EvalRunReportObject } from './eval-run-report.object.ts';

interface LoadedReport {
  readonly config: ComparableConfig;
  readonly object: EvalRunReportObject;
  readonly report: EvalReport;
}

const toComparableConfig = (run: EvalRunObject): ComparableConfig => {
  return {
    authMode: run.authMode,
    datasetId: run.datasetId,
    datasetVersion: run.datasetVersion,
    k: run.k,
  };
};

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => EvalRunReportObject)
export class EvalReportsResolver {
  constructor(
    private readonly evalDatasetsService: EvalDatasetsService,
    private readonly evalJudgeCalibrationsService: EvalJudgeCalibrationsService,
    private readonly evalRunsService: EvalRunsService,
  ) {}

  @Query(() => EvalRunReportObject, {
    description: `The report of one eval run: config tuple, graders, headline numbers (pass rate with a bootstrap 95% interval, judge agreement, detection floor, pass^k, cost per success) and a row per case. Statistics are computed server-side over trials that count.`,
  })
  async evalRunReport(
    @Args('runId', { type: () => ID }) runId: string,
  ): Promise<EvalRunReportObject> {
    const loaded = await this.loadReport(runId);

    return loaded.object;
  }

  @Query(() => EvalRunComparisonObject, {
    description: `Compare a candidate run with a baseline run: McNemar's test over the cases both have an outcome for, the cases that got worse and better, and warnings when the runs used different datasets, auth modes or k.`,
  })
  async evalRunComparison(
    @Args('baseRunId', { type: () => ID }) baseRunId: string,
    @Args('candidateRunId', { type: () => ID }) candidateRunId: string,
  ): Promise<EvalRunComparisonObject> {
    const [base, candidate] = await Promise.all([
      this.loadReport(baseRunId),
      this.loadReport(candidateRunId),
    ]);
    const comparison = compareEvalReports({
      base: { config: base.config, report: base.report },
      candidate: { config: candidate.config, report: candidate.report },
    });

    return toEvalRunComparisonObject(base.object, candidate.object, comparison);
  }

  private async loadReport(runId: string): Promise<LoadedReport> {
    const runRow = await this.evalRunsService.findRunById(runId);

    if (runRow == null) {
      throw new NotFoundException('eval run not found');
    }

    const [dataset, cases, trialRows] = await Promise.all([
      this.evalDatasetsService.findById(runRow.datasetId),
      this.evalDatasetsService.findCases(runRow.datasetId),
      this.evalRunsService.findTrialsByRun(runRow.id),
    ]);
    const gradeRows = await this.evalRunsService.findGradesByTrials(
      trialRows.map((trial) => {
        return trial.id;
      }),
    );
    const trials: ReportTrial[] = trialRows.map((trial) => {
      const grades: ReportGrade[] = gradeRows
        .filter((grade) => {
          return grade.trialId === trial.id;
        })
        .map((grade) => {
          return {
            graderId: grade.graderId,
            graderKind: grade.graderKind,
            graderVersion: grade.graderVersion,
            judgeModel: grade.judgeModel,
            judgeModelVersion: grade.judgeModelVersion,
            verdict: grade.verdict,
          };
        });

      return {
        attempt: trial.attempt,
        caseId: trial.caseId,
        costUsd: trial.costUsd,
        grades,
        status: trial.status,
      };
    });
    const calibrations = await this.loadCalibrations(gradeRows);
    const report = buildEvalReport({
      calibrations,
      cases: cases.map((row) => {
        return { caseId: row.id, split: row.split };
      }),
      k: runRow.k,
      trials,
    });
    const run = toEvalRunObject(runRow);

    return {
      config: toComparableConfig(run),
      object: toEvalRunReportObject(
        run,
        dataset?.name ?? 'Unknown dataset',
        report,
      ),
      report,
    };
  }

  /**
   * @description The latest calibration of each judge id and version that graded the run.
   */
  private async loadCalibrations(
    gradeRows: readonly {
      readonly graderId: string;
      readonly graderKind: string;
      readonly graderVersion: string;
    }[],
  ): Promise<ReportCalibration[]> {
    const judgeIds = [
      ...new Set(
        gradeRows
          .filter((grade) => {
            return grade.graderKind === 'judge';
          })
          .map((grade) => {
            return grade.graderId;
          }),
      ),
    ];
    const histories = await Promise.all(
      judgeIds.map((graderId) => {
        return this.evalJudgeCalibrationsService.findByGrader(graderId);
      }),
    );
    const latest = new Map<string, ReportCalibration>();

    // Each history is newest first, so the first row seen per version is the latest.
    for (const history of histories) {
      for (const row of history) {
        const key = `${row.graderId}\u0000${row.graderVersion}`;

        if (!latest.has(key)) {
          latest.set(key, {
            graderId: row.graderId,
            graderVersion: row.graderVersion,
            kappa: row.kappa,
            kappaCiHigh: row.kappaCiHigh,
            kappaCiLow: row.kappaCiLow,
            status: row.status,
          });
        }
      }
    }

    return [...latest.values()];
  }
}
