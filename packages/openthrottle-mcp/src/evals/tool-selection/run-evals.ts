/**
 * @description Runs the cases against a {@link ToolSelector}: `trials` attempts per case, at most `concurrency`
 * requests in flight, each trial graded by {@link gradeCase}. Model-agnostic — the selector is injected, which
 * is what lets the orchestration be unit-tested with a scripted fake.
 */

import { createHash } from 'node:crypto';

import type { ToolSurface } from '../../model-facing-text/list-tool-surface.ts';
import type { CaseResult, RunResult } from './compare-baseline.ts';
import type {
  Selection,
  SelectionUsage,
  ToolSelectionCase,
  ToolSelector,
  TrialGrade,
} from './eval-case.ts';
import { gradeCase } from './grade-case.ts';

/**
 * @description Options for {@link runEvals}.
 */
export interface RunEvalsOptions {
  readonly cases: readonly ToolSelectionCase[];
  readonly concurrency: number;
  readonly effort: string;
  readonly onTrial: (caseId: string, grade: TrialGrade) => void;
  readonly selector: ToolSelector;
  readonly surface: ToolSurface;
  readonly trials: number;
}

interface TrialOutcome {
  readonly caseId: string;
  readonly grade: TrialGrade;
  readonly selection: Selection;
}

const ZERO_USAGE: SelectionUsage = {
  cacheReadInputTokens: 0,
  cacheWriteInputTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
};

const addUsage = (
  total: SelectionUsage,
  selection: Selection,
): SelectionUsage =>
  selection.kind === 'error'
    ? total
    : {
        cacheReadInputTokens:
          total.cacheReadInputTokens + selection.usage.cacheReadInputTokens,
        cacheWriteInputTokens:
          total.cacheWriteInputTokens + selection.usage.cacheWriteInputTokens,
        inputTokens: total.inputTokens + selection.usage.inputTokens,
        outputTokens: total.outputTokens + selection.usage.outputTokens,
      };

/**
 * @description SHA-256 of the surface (instructions + tools), so a result names the wording it measured.
 * @public
 */
export function surfaceSha256(surface: ToolSurface): string {
  return createHash('sha256').update(JSON.stringify(surface)).digest('hex');
}

/**
 * @description Runs `jobs` with at most `limit` in flight, preserving input order in the result.
 */
async function runBounded<TResult>(
  jobs: readonly (() => Promise<TResult>)[],
  limit: number,
): Promise<TResult[]> {
  const results: TResult[] = [];
  let next = 0;

  const worker = async (): Promise<void> => {
    const index = next;
    next += 1;
    const job = jobs[index];
    if (job === undefined) {
      return;
    }
    results[index] = await job();

    return worker();
  };

  await Promise.all(Array.from({ length: Math.max(1, limit) }, worker));

  return results;
}

/**
 * @description Runs every case and returns the {@link RunResult}.
 * @public
 */
export async function runEvals(options: RunEvalsOptions): Promise<RunResult> {
  const otToolNames = new Set(options.surface.tools.map((tool) => tool.name));
  const jobs = options.cases.flatMap((testCase) =>
    Array.from(
      { length: options.trials },
      () => async (): Promise<TrialOutcome> => {
        const selection = await options.selector.select(testCase.prompt);
        const grade = gradeCase(testCase, selection, otToolNames);
        options.onTrial(testCase.id, grade);

        return { caseId: testCase.id, grade, selection };
      },
    ),
  );
  const outcomes = await runBounded(jobs, options.concurrency);

  const cases = options.cases.map((testCase): CaseResult => {
    const mine = outcomes.filter((o) => o.caseId === testCase.id);

    return {
      failures: mine.flatMap((o) => (o.grade.pass ? [] : [o.grade.reason])),
      id: testCase.id,
      passes: mine.filter((o) => o.grade.pass).length,
      trials: mine.length,
    };
  });

  return {
    cases,
    effort: options.effort,
    model: options.selector.model,
    surfaceSha256: surfaceSha256(options.surface),
    usage: outcomes.reduce(
      (total, o) => addUsage(total, o.selection),
      ZERO_USAGE,
    ),
  };
}
