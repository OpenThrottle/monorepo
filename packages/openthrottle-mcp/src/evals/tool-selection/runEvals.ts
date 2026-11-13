/**
 * @description Runs the cases against a {@link ToolSelector} on the eval core: the cases become a dataset, the
 * selector becomes the system under test (one request per trial, converted to an ATIF trajectory), and
 * {@link gradeCase} runs as a `code` grader. The core's `runEval` owns trials and bounded concurrency; this file
 * folds its trials and grades back into the {@link RunResult} shape baselines are recorded in, and builds the
 * core report for the pass rate, its bootstrap CI and the detection floor. Model-agnostic — the selector is
 * injected, which is what lets the orchestration be unit-tested with a scripted fake.
 */

import { createHash } from 'node:crypto';

import type {
  EvalGrade,
  EvalReport,
  EvalRunConfig,
  EvalRunResult,
  EvalTrial,
  ReportTrial,
} from '@openthrottle/agentic-evals';
import {
  buildEvalReport,
  noopWorkspaceFactory,
  runEval,
} from '@openthrottle/agentic-evals';

import type { ToolSurface } from '../../model-facing-text/listToolSurface.ts';
import type { CaseResult, RunResult } from './compareBaseline.ts';
import {
  TOOL_SELECTION_GRADER_ID,
  TOOL_SELECTION_GRADER_VERSION,
} from './data/data.dataset.ts';
import type {
  SelectionUsage,
  ToolSelectionCase,
  ToolSelector,
  TrialGrade,
} from './eval-case.ts';
import { usageOfTrajectory } from './selection-trajectory.ts';
import {
  buildToolSelectionDataset,
  createToolSelectionGrader,
  createToolSelectionIteration,
} from './tool-selection-core.ts';

/**
 * @description Options for {@link runEvals}.
 */
export interface RunEvalsOptions {
  readonly cases: readonly ToolSelectionCase[];
  readonly concurrency: number;
  readonly effort: string;
  readonly onTrial: (caseId: string, grade: TrialGrade) => void;
  readonly selector: ToolSelector;
  readonly surface: ToolSurface;
  readonly trials: number;
}

/**
 * @description A finished run: the baseline-shaped `result`, and the core's `report` (pass rate with its
 * bootstrap CI, detection floor), which counts an errored trial as excluded rather than failed.
 */
export interface ToolSelectionRun {
  readonly report: EvalReport;
  readonly result: RunResult;
}

const ZERO_USAGE: SelectionUsage = {
  cacheReadInputTokens: 0,
  cacheWriteInputTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
};

/**
 * @description SHA-256 of the surface (instructions + tools), so a result names the wording it measured.
 * @public
 */
export function surfaceSha256(surface: ToolSurface): string {
  return createHash('sha256').update(JSON.stringify(surface)).digest('hex');
}

const addUsage = (total: SelectionUsage, trial: EvalTrial): SelectionUsage => {
  if (trial.status !== 'completed' || trial.trajectory === null) {
    return total;
  }

  const usage = usageOfTrajectory(trial.trajectory.trajectory);

  return {
    cacheReadInputTokens:
      total.cacheReadInputTokens + usage.cacheReadInputTokens,
    cacheWriteInputTokens:
      total.cacheWriteInputTokens + usage.cacheWriteInputTokens,
    inputTokens: total.inputTokens + usage.inputTokens,
    outputTokens: total.outputTokens + usage.outputTokens,
  };
};

/**
 * @description One trial's outcome in baseline terms. Baselines predate the core's `errored` status: a
 * refusal or transport error is a non-pass trial with an `error: …` failure, so a baseline keeps measuring
 * "the model did not produce a right selection".
 */
const gradeOfTrial = (
  trial: EvalTrial,
  grades: readonly EvalGrade[],
): TrialGrade => {
  if (trial.status === 'errored') {
    return { pass: false, reason: `error: ${trial.error ?? 'unknown'}` };
  }

  const verdict = grades.find((grade) => {
    return (
      grade.graderId === TOOL_SELECTION_GRADER_ID &&
      grade.caseId === trial.caseId &&
      grade.attempt === trial.attempt
    );
  })?.verdict;

  if (verdict?.kind === 'pass') {
    return { pass: true };
  }

  if (verdict?.kind === 'fail') {
    return { pass: false, reason: verdict.evidence };
  }

  return {
    pass: false,
    reason: `grader error: ${verdict?.kind === 'error' ? verdict.reason : 'no verdict'}`,
  };
};

const caseResultOf = (
  testCase: ToolSelectionCase,
  run: EvalRunResult,
): CaseResult => {
  const grades = run.trials
    .filter((trial) => {
      return trial.caseId === testCase.id && trial.status !== 'usage_limited';
    })
    .map((trial) => {
      return gradeOfTrial(trial, run.grades);
    });

  return {
    failures: grades.flatMap((grade) => {
      return grade.pass ? [] : [grade.reason];
    }),
    id: testCase.id,
    passes: grades.filter((grade) => {
      return grade.pass;
    }).length,
    trials: grades.length,
  };
};

const reportTrialOf = (
  trial: EvalTrial,
  grades: readonly EvalGrade[],
): ReportTrial => {
  return {
    attempt: trial.attempt,
    caseId: trial.caseId,
    costUsd: null,
    grades: grades
      .filter((grade) => {
        return grade.caseId === trial.caseId && grade.attempt === trial.attempt;
      })
      .map((grade) => {
        return {
          graderId: grade.graderId,
          graderKind: 'code',
          graderVersion: TOOL_SELECTION_GRADER_VERSION,
          judgeModel: null,
          judgeModelVersion: null,
          verdict: grade.verdict.kind,
        };
      }),
    status: trial.status,
  };
};

/**
 * @description Runs every case and returns the {@link RunResult} plus the core report.
 * @public
 */
export async function runEvals(
  options: RunEvalsOptions,
): Promise<ToolSelectionRun> {
  const { cases, selector, surface } = options;
  const config: EvalRunConfig = {
    attempts: options.trials,
    authMode: 'api_key',
    budget: { maxTokens: null },
    concurrency: options.concurrency,
    // The selector owns the model and the effort; the config only has to name a driver the core knows,
    // and a custom iteration never launches it.
    driverId: 'claude',
    effort: undefined,
    model: selector.model,
  };
  const run = await runEval({
    config,
    dataset: buildToolSelectionDataset(cases),
    graders: [
      createToolSelectionGrader({
        cases,
        onGrade: options.onTrial,
        otToolNames: new Set(surface.tools.map((tool) => tool.name)),
      }),
    ],
    runIteration: createToolSelectionIteration({
      onError: options.onTrial,
      selector,
    }),
    workspace: noopWorkspaceFactory,
  });

  return {
    report: buildEvalReport({
      calibrations: [],
      cases: cases.map((testCase) => {
        return { caseId: testCase.id, split: 'test' };
      }),
      k: Math.max(1, options.trials),
      trials: run.trials.map((trial) => {
        return reportTrialOf(trial, run.grades);
      }),
    }),
    result: {
      cases: cases.map((testCase) => {
        return caseResultOf(testCase, run);
      }),
      effort: options.effort,
      model: selector.model,
      surfaceSha256: surfaceSha256(surface),
      usage: run.trials.reduce(addUsage, ZERO_USAGE),
    },
  };
}
