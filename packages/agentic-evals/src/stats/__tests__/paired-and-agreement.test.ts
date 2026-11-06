import { describe, expect, it } from 'vitest';

import type { LabelPair } from '../agreement.ts';
import { catchRate, cohensKappa, falseFailRate } from '../agreement.ts';
import { detectionFloor, requiredSampleSize } from '../detection-floor.ts';
import type { PairedOutcome } from '../paired-difference.ts';
import { mcnemar, pairedDifference } from '../paired-difference.ts';

const repeat = (pair: LabelPair, times: number): readonly LabelPair[] => {
  return Array.from({ length: times }, () => pair);
};

describe('mcnemar', () => {
  it('uses the exact binomial test for few discordant cases', () => {
    // b=2, c=8: 2 * P(X <= 2 | n=10, p=.5) = 2 * (1 + 10 + 45) / 1024 = 0.109375 (hand).
    expect(mcnemar(2, 8)).toEqual({
      b: 2,
      c: 8,
      method: 'exact',
      pValue: 0.109375,
    });
    // b=5, c=20, n=25 is the exact limit: 2 * sum_{i<=5} C(25,i) / 2^25 = 0.0040773 (math.comb).
    expect(mcnemar(5, 20).pValue).toBeCloseTo(0.004077315330505371, 12);
    expect(mcnemar(3, 3).pValue).toBe(1);
  });

  it('uses the continuity-corrected chi-square above 25 discordant cases', () => {
    // Wikipedia's McNemar example, b=121, c=59: chi2 = (|121-59|-1)^2/180 = 20.672,
    // p = erfc(sqrt(chi2/2)) = 5.4501e-6 (math.erfc).
    const wiki = mcnemar(121, 59);

    expect(wiki.method).toBe('chi_square');
    expect(wiki.pValue).toBeCloseTo(5.450094825427124e-6, 12);
    // b=4, c=22: chi2 = 17^2/26 = 11.1154, p = 8.5615e-4 (math.erfc).
    expect(mcnemar(4, 22).pValue).toBeCloseTo(0.0008561456864208788, 12);
  });

  it('has no evidence without discordant cases', () => {
    expect(mcnemar(0, 0).pValue).toBe(1);
  });
});

describe('pairedDifference', () => {
  const run = (outcomes: readonly (0 | 1)[]): readonly PairedOutcome[] => {
    return outcomes.map((outcome, index) => {
      return { caseId: `c${index}`, outcome };
    });
  };

  it('reports the mean difference, McNemar counts and the cases that got worse', () => {
    const a = run([1, 1, 1, 0, 0, 1, 1, 1, 1, 1]);
    const b = run([0, 1, 1, 1, 0, 1, 1, 1, 0, 1]);
    const result = pairedDifference(a, b, { resamples: 2000, seed: 3 });

    if (result.kind !== 'ok') {
      throw new Error(result.reason);
    }

    // mean(a)=0.8, mean(b)=0.7 -> -0.1; worse: c0 and c8 (1 -> 0); better: c3 (0 -> 1).
    expect(result.meanDifference).toBeCloseTo(-0.1, 12);
    expect(result.worse).toEqual({ caseIds: ['c0', 'c8'], count: 2 });
    expect(result.mcnemar).toMatchObject({ b: 2, c: 1, method: 'exact' });
    // Exact two-sided p for b=2, c=1: 2 * P(X <= 1 | n=3) = 2 * 4/8 = 1 (capped).
    expect(result.mcnemar.pValue).toBe(1);
    expect(result.ci.lower).toBeLessThanOrEqual(-0.1);
    expect(result.ci.upper).toBeGreaterThanOrEqual(-0.1);
    expect(result.n).toBe(10);
  });

  it('is reproducible and degenerate when the runs agree', () => {
    const a = run([1, 0, 1, 0]);
    const same = pairedDifference(a, a, { resamples: 500, seed: 9 });

    expect(same).toMatchObject({
      ci: { lower: 0, upper: 0 },
      meanDifference: 0,
      worse: { count: 0 },
    });
  });

  it('matches cases by id, not position', () => {
    const a = [
      { caseId: 'x', outcome: 1 },
      { caseId: 'y', outcome: 0 },
    ] as const;
    const b = [
      { caseId: 'y', outcome: 1 },
      { caseId: 'x', outcome: 1 },
    ] as const;
    const result = pairedDifference(a, b, { resamples: 100 });

    expect(result).toMatchObject({ kind: 'ok', meanDifference: 0.5 });
  });

  it('returns an error result for mismatched or duplicate cases', () => {
    expect(pairedDifference(run([1, 0]), run([1]))).toMatchObject({
      kind: 'error',
    });
    expect(
      pairedDifference(
        [
          { caseId: 'a', outcome: 1 },
          { caseId: 'a', outcome: 0 },
        ],
        run([1, 0]),
      ),
    ).toMatchObject({ kind: 'error' });
    expect(pairedDifference([], [])).toMatchObject({ kind: 'error' });
  });
});

describe('agreement', () => {
  // Wikipedia's Cohen's kappa example: 50 grant proposals, rater A (here the judge) and rater B
  // (the human): both yes 20, A yes/B no 5, A no/B yes 10, both no 15. po = 35/50 = 0.7,
  // pe = (25/50)(30/50) + (25/50)(20/50) = 0.3 + 0.2 = 0.5, kappa = (0.7 - 0.5) / 0.5 = 0.4.
  const pairs = [
    ...repeat({ human: 'pass', judge: 'pass' }, 20),
    ...repeat({ human: 'fail', judge: 'pass' }, 5),
    ...repeat({ human: 'pass', judge: 'fail' }, 10),
    ...repeat({ human: 'fail', judge: 'fail' }, 15),
  ];

  it('gives kappa 0.4 for the textbook table', () => {
    expect(cohensKappa(pairs)).toBeCloseTo(0.4, 12);
  });

  it('is 1 for perfect agreement and 0 for chance-level agreement', () => {
    expect(
      cohensKappa([
        ...repeat({ human: 'pass', judge: 'pass' }, 5),
        ...repeat({ human: 'fail', judge: 'fail' }, 5),
      ]),
    ).toBe(1);
    expect(
      cohensKappa([
        ...repeat({ human: 'pass', judge: 'pass' }, 5),
        ...repeat({ human: 'fail', judge: 'pass' }, 5),
        ...repeat({ human: 'pass', judge: 'fail' }, 5),
        ...repeat({ human: 'fail', judge: 'fail' }, 5),
      ]),
    ).toBeCloseTo(0, 12);
  });

  it('is undefined for no pairs or constant raters', () => {
    expect(cohensKappa([])).toBeNull();
    expect(cohensKappa(repeat({ human: 'pass', judge: 'pass' }, 4))).toBeNull();
  });

  it('computes catch rate and false-fail rate on the same table', () => {
    // Human failed 5 + 15 = 20 trials; the judge failed 15 of them -> 0.75.
    expect(catchRate(pairs)).toBeCloseTo(0.75, 12);
    // Human passed 20 + 10 = 30 trials; the judge failed 10 of them -> 1/3.
    expect(falseFailRate(pairs)).toBeCloseTo(1 / 3, 12);
    expect(catchRate(repeat({ human: 'pass', judge: 'pass' }, 3))).toBeNull();
    expect(
      falseFailRate(repeat({ human: 'fail', judge: 'pass' }, 3)),
    ).toBeNull();
  });
});

describe('detectionFloor and requiredSampleSize', () => {
  it('matches the normal-approximation formula', () => {
    // n=100, p=.5: (1.959964 + 0.841621) * sqrt(2 * .25 / 100) = 0.198102 (NormalDist.inv_cdf).
    expect(detectionFloor({ baseRate: 0.5, n: 100 })).toBeCloseTo(
      0.19810199057996725,
      9,
    );
  });

  it("agrees with Lehr's rule, n = 16 sigma^2 / delta^2", () => {
    // sigma^2 = .25, delta = .2: Lehr gives 16 * .25 / .04 = 100; the exact z sum
    // (15.68 instead of 16) gives 98.11, so 99 cases.
    expect(
      requiredSampleSize({ baseRate: 0.5, minDetectableDifference: 0.2 }),
    ).toBe(99);
  });

  it('round-trips and shrinks with correlation', () => {
    const n = requiredSampleSize({
      baseRate: 0.6,
      minDetectableDifference: 0.1,
    });
    const floor = detectionFloor({ baseRate: 0.6, n: n ?? 0 });

    expect(floor).toBeLessThanOrEqual(0.1);
    expect(
      detectionFloor({ baseRate: 0.6, correlation: 0.5, n: 100 }),
    ).toBeLessThan(detectionFloor({ baseRate: 0.6, n: 100 }) ?? 0);
  });

  it('rejects invalid input', () => {
    expect(detectionFloor({ baseRate: 0, n: 10 })).toBeNull();
    expect(detectionFloor({ baseRate: 0.5, n: 0 })).toBeNull();
    expect(
      requiredSampleSize({ baseRate: 0.5, minDetectableDifference: 0 }),
    ).toBeNull();
  });
});
