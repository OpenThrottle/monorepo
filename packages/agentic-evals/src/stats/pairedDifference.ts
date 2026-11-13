import type { BootstrapCi, BootstrapCiOptions } from './bootstrap.ts';
import { bootstrapCi } from './bootstrap.ts';
import { erfc } from './normal.ts';

/**
 * @description One case's outcome in one run.
 * @public
 */
export interface PairedOutcome {
  readonly caseId: string;
  readonly outcome: 0 | 1;
}

/**
 * @description McNemar's test on the discordant cases: `b` passed in run A and failed in run B,
 * `c` the reverse. `exact` is the two-sided binomial test (used while `b + c <= 25`);
 * `chi_square` is the continuity-corrected statistic with 1 degree of freedom.
 * @public
 */
export interface McNemarResult {
  readonly b: number;
  readonly c: number;
  readonly method: 'chi_square' | 'exact';
  readonly pValue: number;
}

/**
 * @description Run B against run A over the same cases. `meanDifference` is `mean(B) - mean(A)`,
 * `ci` its paired bootstrap interval. `worse` lists the cases that passed in A and failed in B,
 * in input order.
 * @public
 */
export interface PairedDifference {
  readonly ci: BootstrapCi;
  readonly kind: 'ok';
  readonly mcnemar: McNemarResult;
  readonly meanDifference: number;
  readonly n: number;
  readonly worse: {
    readonly caseIds: readonly string[];
    readonly count: number;
  };
}

/**
 * @description Returned instead of throwing when the two runs do not cover the same cases.
 * @public
 */
export interface PairedDifferenceError {
  readonly kind: 'error';
  readonly reason: string;
}

/**
 * @description Largest `b + c` for which the exact binomial test is used.
 */
const EXACT_LIMIT = 25;

const binomialHalfCdf = (n: number, upTo: number): number => {
  let term = 0.5 ** n;
  let sum = 0;

  for (let i = 0; i <= upTo; i += 1) {
    sum += term;
    term *= (n - i) / (i + 1);
  }

  return sum;
};

/**
 * @description McNemar's test for paired binary outcomes. With `b + c <= 25` the p-value is the
 * exact two-sided binomial `min(1, 2 * P(X <= min(b, c)))` for `X ~ Binomial(b + c, 1/2)`;
 * above that it is `chi2 = (|b - c| - 1)^2 / (b + c)` with a 1 d.f. tail `erfc(sqrt(chi2 / 2))`.
 * No discordant cases means no evidence of a difference, p = 1.
 * @public
 */
export const mcnemar = (b: number, c: number): McNemarResult => {
  const discordant = b + c;

  if (discordant === 0) {
    return { b, c, method: 'exact', pValue: 1 };
  }

  if (discordant <= EXACT_LIMIT) {
    return {
      b,
      c,
      method: 'exact',
      pValue: Math.min(1, 2 * binomialHalfCdf(discordant, Math.min(b, c))),
    };
  }

  const statistic = (Math.abs(b - c) - 1) ** 2 / discordant;

  return {
    b,
    c,
    method: 'chi_square',
    pValue: erfc(Math.sqrt(statistic / 2)),
  };
};

const toMap = (
  outcomes: readonly PairedOutcome[],
): Map<string, 0 | 1> | null => {
  const map = new Map(
    outcomes.map((entry) => {
      return [entry.caseId, entry.outcome] as const;
    }),
  );

  return map.size === outcomes.length ? map : null;
};

/**
 * @description Compares two runs over the same cases: mean difference with a paired bootstrap CI,
 * McNemar's test, and the cases that got worse. `a` is the baseline, `b` the candidate. Case ids
 * must be unique and identical in both runs; otherwise an error result says so.
 * @public
 */
export const pairedDifference = (
  a: readonly PairedOutcome[],
  b: readonly PairedOutcome[],
  options: BootstrapCiOptions = {},
): PairedDifference | PairedDifferenceError => {
  const mapA = toMap(a);
  const mapB = toMap(b);

  if (mapA === null || mapB === null) {
    return { kind: 'error', reason: 'Case ids must be unique within a run.' };
  }

  const sameCases =
    mapA.size === mapB.size &&
    a.every((entry) => {
      return mapB.has(entry.caseId);
    });

  if (!sameCases || a.length === 0) {
    return {
      kind: 'error',
      reason: 'Both runs must cover the same, non-empty set of cases.',
    };
  }

  const pairs = a.map((entry) => {
    return {
      after: mapB.get(entry.caseId) ?? 0,
      before: entry.outcome,
      caseId: entry.caseId,
    };
  });
  const differences = pairs.map((pair) => {
    return pair.after - pair.before;
  });
  const worseIds = pairs
    .filter((pair) => {
      return pair.before === 1 && pair.after === 0;
    })
    .map((pair) => {
      return pair.caseId;
    });
  const improved = pairs.filter((pair) => {
    return pair.before === 0 && pair.after === 1;
  }).length;
  const ci = bootstrapCi(differences, options);

  if (ci === null) {
    return { kind: 'error', reason: 'The bootstrap options are invalid.' };
  }

  return {
    ci,
    kind: 'ok',
    mcnemar: mcnemar(worseIds.length, improved),
    meanDifference: ci.mean,
    n: pairs.length,
    worse: { caseIds: worseIds, count: worseIds.length },
  };
};
