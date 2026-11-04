/**
 * @description The grader: a pure function from (case, the model's first turn) to pass/fail with a reason.
 * This is the only part of the suite that runs in CI — through the package's ordinary `test` target — because it
 * needs no model and no network.
 */

import type {
  ArgMatcher,
  SelectedCall,
  Selection,
  ToolSelectionCase,
  TrialGrade,
} from './eval-case.ts';

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const containsText = (haystack: unknown, needle: string): boolean => {
  if (typeof haystack === 'string') {
    return haystack.toLowerCase().includes(needle.toLowerCase());
  }
  if (Array.isArray(haystack)) {
    return haystack.some((element: unknown) => containsText(element, needle));
  }
  if (isRecord(haystack)) {
    return Object.values(haystack).some((element) =>
      containsText(element, needle),
    );
  }

  return false;
};

/**
 * @description Whether one argument value satisfies its matcher.
 * @public
 */
export function matchesArg(value: unknown, matcher: ArgMatcher): boolean {
  switch (matcher.kind) {
    case 'equals':
      return value === matcher.value;
    case 'includes':
      return containsText(value, matcher.value);
    case 'present':
      return value !== undefined && value !== null;
  }
}

/**
 * @description The names of the matchers a call fails, empty when it satisfies all of them.
 */
const failedArgs = (
  call: SelectedCall,
  args: Readonly<Record<string, ArgMatcher>>,
): readonly string[] => {
  const input = isRecord(call.input) ? call.input : {};

  return Object.entries(args)
    .filter(([key, matcher]) => !matchesArg(input[key], matcher))
    .map(([key]) => key);
};

const describeCalls = (calls: readonly SelectedCall[]): string =>
  calls.length === 0 ? 'no tool call' : calls.map((c) => c.name).join(', ');

/**
 * @description Grades one trial. `otToolNames` is the set of OT tools on the surface; a `no-call` case still
 * passes when the model reaches for a harness tool (e.g. `bash`), since only OT over-triggering is under test.
 * @public
 */
export function gradeCase(
  testCase: ToolSelectionCase,
  selection: Selection,
  otToolNames: ReadonlySet<string>,
): TrialGrade {
  if (selection.kind === 'error') {
    return { pass: false, reason: `error: ${selection.message}` };
  }

  const { calls } = selection;
  const forbidden = calls.find((call) => testCase.forbid.includes(call.name));
  if (forbidden !== undefined) {
    return { pass: false, reason: `called forbidden ${forbidden.name}` };
  }

  const { expect } = testCase;
  if (expect.kind === 'no-call') {
    const otCalls = calls.filter((call) => otToolNames.has(call.name));

    return otCalls.length === 0
      ? { pass: true }
      : {
          pass: false,
          reason: `expected no OT call, got ${describeCalls(otCalls)}`,
        };
  }

  const candidates = calls.filter((call) => expect.tools.includes(call.name));
  if (candidates.length === 0) {
    return {
      pass: false,
      reason: `expected ${expect.tools.join(' | ')}, got ${describeCalls(calls)}`,
    };
  }
  if (candidates.some((call) => failedArgs(call, expect.args).length === 0)) {
    return { pass: true };
  }

  const firstCandidate = candidates[0];
  const missed =
    firstCandidate === undefined ? [] : failedArgs(firstCandidate, expect.args);

  return {
    pass: false,
    reason: `${firstCandidate?.name ?? 'call'} args did not match: ${missed.join(', ')}`,
  };
}
