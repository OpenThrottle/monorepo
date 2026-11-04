/**
 * @description Same-model baseline comparison. A run is only ever compared with a baseline recorded on the SAME
 * model: a different model is a different experiment, and comparing across models would report model drift as
 * a wording regression.
 */

import type { SelectionUsage } from './eval-case.ts';

/**
 * @description Per-case outcome over `trials` attempts.
 */
export interface CaseResult {
  readonly failures: readonly string[];
  readonly id: string;
  readonly passes: number;
  readonly trials: number;
}

/**
 * @description A full run, as written to tmp/ and (with `--write-baseline`) committed as a baseline.
 * `surfaceSha256` fingerprints the tool surface the run saw, so a baseline says which wording it measured.
 */
export interface RunResult {
  readonly cases: readonly CaseResult[];
  readonly effort: string;
  readonly model: string;
  readonly surfaceSha256: string;
  readonly usage: SelectionUsage;
}

/**
 * @description One case's change between baseline and current, as pass rates in [0, 1].
 */
export interface CaseDelta {
  readonly baselineRate: number;
  readonly currentRate: number;
  readonly id: string;
}

/**
 * @description The comparison. `model-mismatch` refuses to compare; `compared` lists regressions (rate dropped
 * by more than the tolerance), improvements, and cases on only one side.
 */
export type BaselineComparison =
  | {
      readonly added: readonly string[];
      readonly improvements: readonly CaseDelta[];
      readonly kind: 'compared';
      readonly regressions: readonly CaseDelta[];
      readonly removed: readonly string[];
    }
  | {
      readonly baselineModel: string;
      readonly currentModel: string;
      readonly kind: 'model-mismatch';
    };

/**
 * @description A case's pass rate; a case with no trials counts as 0.
 */
export function passRate(result: CaseResult): number {
  return result.trials === 0 ? 0 : result.passes / result.trials;
}

/**
 * @description Compares `current` with `baseline`. A regression is a drop in pass rate strictly greater than
 * `tolerance` (default 0: any drop counts, which is right for single-trial runs).
 * @public
 */
export function compareBaseline(
  baseline: RunResult,
  current: RunResult,
  tolerance = 0,
): BaselineComparison {
  if (baseline.model !== current.model) {
    return {
      baselineModel: baseline.model,
      currentModel: current.model,
      kind: 'model-mismatch',
    };
  }

  const baselineById = new Map(baseline.cases.map((c) => [c.id, c]));
  const currentIds = new Set(current.cases.map((c) => c.id));
  const deltas = current.cases.flatMap((result): CaseDelta[] => {
    const before = baselineById.get(result.id);

    return before === undefined
      ? []
      : [
          {
            baselineRate: passRate(before),
            currentRate: passRate(result),
            id: result.id,
          },
        ];
  });

  return {
    added: current.cases
      .filter((c) => !baselineById.has(c.id))
      .map((c) => c.id),
    improvements: deltas.filter((d) => d.currentRate > d.baselineRate),
    kind: 'compared',
    regressions: deltas.filter(
      (d) => d.baselineRate - d.currentRate > tolerance,
    ),
    removed: baseline.cases
      .filter((c) => !currentIds.has(c.id))
      .map((c) => c.id),
  };
}
