/**
 * @description Re-homes the tool-selection cases as an eval-core dataset. The case ids stay the baseline
 * keys, so the dataset id of a case is the same stable id the baselines use.
 */

import type { EvalCase, EvalDataset } from '@openthrottle/agentic-evals';

import {
  TOOL_SELECTION_DATASET_ID,
  TOOL_SELECTION_DATASET_VERSION,
  TOOL_SELECTION_TARGET,
} from './data/data.dataset.ts';
import type { ToolSelectionCase } from './eval-case.ts';

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
 * @description The dataset for `cases`, one core case per tool-selection case.
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
