import type { AgentParseControlKind } from './contract/step-results.ts';

/** Matches `<ralph:task-complete>uuid</ralph:task-complete>`. */
const RALPH_COMPLETE_TASK_REGEX =
  /<ralph:task-complete>([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})<\/ralph:task-complete>/gi;

const PROMISE_COMPLETE = '<promise>COMPLETE</promise>';
const PROMISE_ERROR = '<promise>ERROR</promise>';
const PROMISE_INPUT_REQUIRED = '<promise>INPUT_REQUIRED</promise>';

/** Return shape for {@link getRalphOutputMarkerFlags}; not imported by name elsewhere in the monorepo. */
interface RalphOutputMarkerFlags {
  readonly hasComplete: boolean;
  readonly hasError: boolean;
  readonly hasInputRequired: boolean;
}

/**
 * @public
 * @description Snapshot of delimiter / terminal markers in agent output (aligned with
 * `tools/workflows` {@link getRalphOutputMarkerFlags}).
 */
export const getRalphOutputMarkerFlags = (
  result: string,
): RalphOutputMarkerFlags => ({
  hasComplete: result.includes(PROMISE_COMPLETE),
  hasError: result.includes(PROMISE_ERROR),
  hasInputRequired: result.includes(PROMISE_INPUT_REQUIRED),
});

/**
 * @public
 * @description Parses `<ralph:task-complete>uuid</ralph:task-complete>`;
 * returns unique task ids (lowercase).
 */
export const parseRalphCompleteTaskSignals = (
  result: string,
): readonly string[] => {
  const ids: string[] = [];
  let m: RegExpExecArray | null;

  RALPH_COMPLETE_TASK_REGEX.lastIndex = 0;

  while ((m = RALPH_COMPLETE_TASK_REGEX.exec(result)) !== null) {
    ids.push(m[1]!.toLowerCase());
  }

  return [...new Set(ids)];
};

/**
 * @public
 * @description True when output contains `<promise>COMPLETE</promise>`.
 */
export const ralphOutputHasPromiseComplete = (result: string): boolean => {
  return result.includes(PROMISE_COMPLETE);
};

/**
 * @public
 * @description Terminal control from promise markers (order matches
 * `parseRalphResponse` in `ralph.ts`).
 */
export const parseRalphAgentParseControl = (
  result: string,
): AgentParseControlKind => {
  const outputs = getRalphOutputMarkerFlags(result);
  const { hasComplete, hasError, hasInputRequired } = outputs;

  // 1. 🔴 We check for any errors
  if (hasError) {
    return 'ERROR';
  }

  // 2. 🟡 Then we check for any input required
  if (hasInputRequired) {
    return 'INPUT_REQUIRED';
  }

  // 3. 🟢 Then we check for any completion
  if (hasComplete) {
    return 'COMPLETE';
  }

  return 'NONE';
};
