/**
 * @description The tool-selection system under test as an eval-core `RunEvalIteration`: one Messages API request
 * through the {@link ToolSelector}, converted to an ATIF trajectory. A refusal or transport error rejects, which
 * the runner records as an `errored` trial — excluded from the core's pass rate, never a fail.
 */

import type { RunEvalIteration } from '@openthrottle/agentic-evals';

import type { ToolSelector, TrialGrade } from './eval-case.ts';
import { selectionToTrajectory } from './selection-trajectory.ts';

/**
 * @description Options for {@link createToolSelectionIteration}. `onError` observes a failed request before the
 * iteration rejects.
 */
export interface ToolSelectionIterationOptions {
  readonly onError: (caseId: string, grade: TrialGrade) => void;
  readonly selector: ToolSelector;
}

/**
 * @description The iteration for `selector`.
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
