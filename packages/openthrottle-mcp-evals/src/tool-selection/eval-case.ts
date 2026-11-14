/**
 * @description Types for the MCP tool-selection eval suite: a case is a user prompt plus the OT tool (and key
 * arguments) an agent should reach for on its first turn — or, for a control case, the assertion that it
 * reaches for no OT tool at all. See ./README.md for the authoring rules.
 */

/**
 * @description Feature areas, used to filter a run (`--case plan-crud`) and to group the report.
 */
export const EVAL_AREA = {
  CONTROL: 'control',
  FOLLOW_UP: 'follow-up',
  OUTPUT: 'output',
  PLAN_CRUD: 'plan-crud',
  SEARCH: 'search',
  TASK_CRUD: 'task-crud',
} as const;

export type EvalArea = (typeof EVAL_AREA)[keyof typeof EVAL_AREA];

/**
 * @description How one argument of the selected tool call is checked.
 * - `equals`: strict equality on a scalar.
 * - `includes`: a string containing `value` (case-insensitive), or an array/object with any nested string
 *   that does — so `{ tasks: includes('backfill') }` matches a batch whose items carry that title.
 * - `present`: the argument is set to anything other than `null`/`undefined`.
 */
export type ArgMatcher =
  | { readonly kind: 'equals'; readonly value: boolean | number | string }
  | { readonly kind: 'includes'; readonly value: string }
  | { readonly kind: 'present' };

/**
 * @description What the first turn must contain. `call` passes when ANY first-turn call names one of `tools`
 * and satisfies every matcher in `args`; `no-call` (control cases) passes when the turn calls no OT tool.
 */
export type CaseExpectation =
  | {
      readonly args: Readonly<Record<string, ArgMatcher>>;
      readonly kind: 'call';
      readonly tools: readonly string[];
    }
  | { readonly kind: 'no-call' };

/**
 * @description Where a case came from. A `regression` case was written against a wording that made agents pick
 * wrongly, confirmed failing on that wording, and only then fixed — `fixedBy` names the change (commit subject
 * or PR). `seed` cases are initial coverage that passed on the wording they were written against.
 */
export type CaseOrigin =
  | { readonly fixedBy: string; readonly kind: 'regression' }
  | { readonly kind: 'seed' };

/**
 * @description One eval case.
 */
export interface ToolSelectionCase {
  readonly area: EvalArea;
  readonly expect: CaseExpectation;
  /** @description Tools that fail the case if called at all (e.g. a destructive near-miss). */
  readonly forbid: readonly string[];
  readonly id: string;
  readonly origin: CaseOrigin;
  readonly prompt: string;
}

/**
 * @description One tool call the model made on its first turn.
 */
export interface SelectedCall {
  readonly input: unknown;
  readonly name: string;
}

/**
 * @description Token usage for one model request, as the provider reported it.
 */
export interface SelectionUsage {
  readonly cacheReadInputTokens: number;
  readonly cacheWriteInputTokens: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

/**
 * @description The outcome of asking a model to handle one prompt. `error` covers transport failures and
 * refusals — both fail the case, but are reported separately from a wrong pick.
 */
export type Selection =
  | {
      readonly calls: readonly SelectedCall[];
      readonly kind: 'calls';
      readonly text: string;
      readonly usage: SelectionUsage;
    }
  | { readonly kind: 'error'; readonly message: string };

/**
 * @description A model backend. Given the tool surface and a prompt, returns the model's first turn.
 */
export interface ToolSelector {
  readonly model: string;
  readonly select: (prompt: string) => Promise<Selection>;
}

/**
 * @description The result of grading one trial.
 */
export type TrialGrade =
  { readonly pass: false; readonly reason: string } | { readonly pass: true };
