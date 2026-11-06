/**
 * @description {@link gradeCase} as an eval-core `code` grader. The grader reads the first agent step's tool
 * calls out of the trial's trajectory and applies the unchanged pure grading rules.
 */

import type {
  EvalCase,
  EvalTrial,
  Grader,
  GraderVerdict,
} from '@openthrottle/agentic-evals';

import {
  TOOL_SELECTION_GRADER_ID,
  TOOL_SELECTION_GRADER_VERSION,
} from './data/data.dataset.ts';
import type { ToolSelectionCase, TrialGrade } from './eval-case.ts';
import { gradeCase } from './grade-case.ts';
import { selectionFromTrajectory } from './selection-trajectory.ts';

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
 * @description The grader (id `tool-selection`) for `cases`. A trial without a trajectory, or a case the
 * grader does not know, is an `error` verdict: the grader could not decide.
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
