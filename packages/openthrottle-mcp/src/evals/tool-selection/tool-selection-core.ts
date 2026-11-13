/**
 * @description The tool-selection suite expressed in eval-core terms: its cases as an `EvalDataset`, the
 * system under test as a `RunEvalIteration`, and {@link gradeCase} as a `code` grader.
 */

import type {
  EvalCase,
  EvalDataset,
  EvalTrial,
  Grader,
  GraderVerdict,
  RunEvalIteration,
} from '@openthrottle/agentic-evals';

import {
  TOOL_SELECTION_DATASET_ID,
  TOOL_SELECTION_DATASET_VERSION,
  TOOL_SELECTION_GRADER_ID,
  TOOL_SELECTION_GRADER_VERSION,
  TOOL_SELECTION_TARGET,
} from './data/data.dataset.ts';
import type {
  ToolSelectionCase,
  ToolSelector,
  TrialGrade,
} from './eval-case.ts';
import { gradeCase } from './grade-case.ts';
import {
  selectionFromTrajectory,
  selectionToTrajectory,
} from './selection-trajectory.ts';

const toEvalCase = (testCase: ToolSelectionCase): EvalCase => {
  return {
    gold: {
      area: testCase.area,
      expect: testCase.expect,
      forbid: testCase.forbid,
    },
    id: testCase.id,
    input: { cwdSetup: { files: [] }, prompt: testCase.prompt },
    // The suite has no tuning loop: nobody iterates a prompt or optimizer against these cases, the
    // cases are the regression suite for tool wording itself. Every case is therefore held out
    // (`test`); a `dev` split would only shrink the set the baselines measure.
    split: 'test',
  };
};

/**
 * @description Re-homes the tool-selection cases as an eval-core dataset, one core case per tool-selection
 * case. The case ids stay the baseline keys, so the dataset id of a case is the same stable id the baselines use.
 * @public
 */
export const buildToolSelectionDataset = (
  cases: readonly ToolSelectionCase[],
): EvalDataset => {
  return {
    cases: cases.map(toEvalCase),
    id: TOOL_SELECTION_DATASET_ID,
    name: TOOL_SELECTION_TARGET,
    version: TOOL_SELECTION_DATASET_VERSION,
  };
};

/**
 * @description Options for {@link createToolSelectionGrader}. `onGrade` observes every graded trial, which is
 * how the CLI prints progress.
 */
export interface ToolSelectionGraderOptions {
  readonly cases: readonly ToolSelectionCase[];
  readonly onGrade: (caseId: string, grade: TrialGrade) => void;
  readonly otToolNames: ReadonlySet<string>;
}

/**
 * @description {@link gradeCase} as an eval-core `code` grader (id `tool-selection`). The grader reads the first
 * agent step's tool calls out of the trial's trajectory and applies the unchanged pure grading rules. A trial
 * without a trajectory, or a case the grader does not know, is an `error` verdict: the grader could not decide.
 * @public
 */
export const createToolSelectionGrader = (
  options: ToolSelectionGraderOptions,
): Grader => {
  const byId = new Map(
    options.cases.map((testCase) => {
      return [testCase.id, testCase];
    }),
  );

  return {
    grade: async (
      trial: EvalTrial,
      evalCase: EvalCase,
    ): Promise<GraderVerdict> => {
      const testCase = byId.get(evalCase.id);

      if (testCase === undefined) {
        return { kind: 'error', reason: `unknown case ${evalCase.id}` };
      }

      if (trial.trajectory === null) {
        return { kind: 'error', reason: 'the trial recorded no trajectory' };
      }

      const grade = gradeCase(
        testCase,
        selectionFromTrajectory(trial.trajectory.trajectory),
        options.otToolNames,
      );

      options.onGrade(evalCase.id, grade);

      if (grade.pass) {
        return {
          evidence: 'matched the expected first-turn selection',
          kind: 'pass',
        };
      }

      return { evidence: grade.reason, kind: 'fail' };
    },
    id: TOOL_SELECTION_GRADER_ID,
    kind: 'code',
    version: TOOL_SELECTION_GRADER_VERSION,
  };
};

/**
 * @description Options for {@link createToolSelectionIteration}. `onError` observes a failed request before the
 * iteration rejects.
 */
export interface ToolSelectionIterationOptions {
  readonly onError: (caseId: string, grade: TrialGrade) => void;
  readonly selector: ToolSelector;
}

/**
 * @description The tool-selection system under test as an eval-core `RunEvalIteration`: one Messages API request
 * through the {@link ToolSelector}, converted to an ATIF trajectory. A refusal or transport error rejects, which
 * the runner records as an `errored` trial, excluded from the core's pass rate and never a fail.
 * @public
 */
export const createToolSelectionIteration = (
  options: ToolSelectionIterationOptions,
): RunEvalIteration => {
  const { onError, selector } = options;

  return async (input) => {
    const started = Date.now();
    const selection = await selector.select(input.evalCase.input.prompt);

    if (selection.kind === 'error') {
      onError(input.evalCase.id, {
        pass: false,
        reason: `error: ${selection.message}`,
      });

      throw new Error(selection.message);
    }

    return {
      durationMs: Date.now() - started,
      finalText: selection.text,
      kind: 'trajectory',
      trajectory: selectionToTrajectory(selection, selector.model),
    };
  };
};
