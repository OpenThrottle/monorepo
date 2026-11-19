/**
 * @description String literals written to `eval_datasets.target` and `eval_cases.split`
 * (CHECK-constrained TEXT, migration 147). The SQL CHECKs and these objects must list the same
 * values; `EVAL_SPLIT` mirrors `EvalSplit` in `@openthrottle/agentic-evals`.
 * @public
 */

/**
 * What a dataset evaluates.
 * @public
 */
export const EVAL_DATASET_TARGET = {
  MCP_TOOL_SELECTION: 'mcp_tool_selection',
  PLAN_TASK: 'plan_task',
  SKILL: 'skill',
} as const;

/**
 * Which side of a dataset a case sits on: `dev` for iterating, `test` held out.
 * @public
 */
export const EVAL_SPLIT = {
  DEV: 'dev',
  TEST: 'test',
} as const;
