import { LOOP_OUTPUT_KIND } from '../contract/index.ts';

const TOOL_LINE_PATTERN = /^\s*→ /;
const LINE_END_PATTERN = /(?<=\n)/;

/** @public */
export interface OutputRun {
  readonly kind: typeof LOOP_OUTPUT_KIND.TOOL | typeof LOOP_OUTPUT_KIND.WORKER;
  readonly text: string;
}

/**
 * @description Splits a batch of driver output at line boundaries into maximal runs of tool lines
 * (`→ Tool arg`, the drivers' format) and prose, in order. Nothing is dropped or reordered:
 * concatenating the runs reproduces the input exactly (blank lines stay in the prose run they sit in).
 * @public
 */
export const splitToolRuns = (text: string): readonly OutputRun[] => {
  return text
    .split(LINE_END_PATTERN)
    .filter((line) => line !== '')
    .reduce<readonly OutputRun[]>((runs, line) => {
      const kind = TOOL_LINE_PATTERN.test(line)
        ? LOOP_OUTPUT_KIND.TOOL
        : LOOP_OUTPUT_KIND.WORKER;
      const last = runs[runs.length - 1];

      if (last !== undefined && last.kind === kind) {
        return [...runs.slice(0, -1), { kind, text: last.text + line }];
      }

      return [...runs, { kind, text: line }];
    }, []);
};
