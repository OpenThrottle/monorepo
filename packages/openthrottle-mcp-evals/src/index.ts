/**
 * @description The MCP tool-selection eval, for programmatic runs. The usual entry point is the
 * `eval-tool-selection` target (`src/tool-selection/cli.ts`); this re-exports the pieces a caller
 * composing its own run needs.
 */

/** @public */
export type {
  BaselineComparison,
  RunResult,
} from './tool-selection/compareBaseline.ts';
/** @public */
export { compareBaseline, passRate } from './tool-selection/compareBaseline.ts';
/** @public */
export { TOOL_SELECTION_CASES } from './tool-selection/data/cases.ts';
/** @public */
export type {
  ToolSelectionCase,
  TrialGrade,
} from './tool-selection/eval-case.ts';
/** @public */
export { gradeCase } from './tool-selection/gradeCase.ts';
/** @public */
export type { ToolSelectionRun } from './tool-selection/runEvals.ts';
/** @public */
export { runEvals } from './tool-selection/runEvals.ts';
