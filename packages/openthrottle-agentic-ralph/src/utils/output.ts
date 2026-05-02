import type { AgentOutputControlType } from '../contract/step-results.js';

/** @description Matches `<ralph:task-complete>uuid</ralph:task-complete>`. */
const TASK_COMPLETE_REGEX = /<ralph:task-complete>([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})<\/ralph:task-complete>/gi; // prettier-ignore

const PROMISE_COMPLETE = '<promise>COMPLETE</promise>';
const PROMISE_ERROR = '<promise>ERROR</promise>';
const PROMISE_INPUT_REQUIRED = '<promise>INPUT_REQUIRED</promise>';

export interface RalphOutputMarkerFlags {
  readonly hasComplete: boolean;
  readonly hasError: boolean;
  readonly hasInputRequired: boolean;
}

/**
 * @description Snapshot of delimiter / terminal markers in agent output
 */
export const getRalphOutputMarkerFlags = (
  result: string,
): RalphOutputMarkerFlags => ({
  hasComplete: result.includes(PROMISE_COMPLETE),
  hasError: result.includes(PROMISE_ERROR),
  hasInputRequired: result.includes(PROMISE_INPUT_REQUIRED),
});

/**
 * @description Parses `<ralph:task-complete>uuid</ralph:task-complete>`; returns unique task ids (lowercase).
 */
export const parseAgentCompleteTaskSignals = (
  result: string,
): readonly string[] => {
  const ids: string[] = [];
  let m: RegExpExecArray | null;

  TASK_COMPLETE_REGEX.lastIndex = 0;

  while ((m = TASK_COMPLETE_REGEX.exec(result)) !== null) {
    ids.push(m[1]!.toLowerCase());
  }

  return [...new Set(ids)];
};

/**
 * @description True when output contains `<promise>COMPLETE</promise>`.
 */
export const agentOutputHasPromiseComplete = (result: string): boolean => {
  return result.includes(PROMISE_COMPLETE);
};

/**
 * @description Terminal control from promise markers ~ ordering is intentional
 */
export const parseAgentOutput = (result: string): AgentOutputControlType => {
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
