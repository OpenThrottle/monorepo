import { describe, expect, it } from 'vitest';

import type { GraderVerdict } from '../../types/grader.ts';
import type { JudgeCalibrationPair } from '../judge-calibration.ts';
import { calibrateJudge } from '../judge-calibration.ts';

interface Counts {
  readonly bothFail: number;
  readonly bothPass: number;
  readonly judgeFailHumanPass: number;
  readonly judgePassHumanFail: number;
}

const verdict = (kind: 'fail' | 'pass'): GraderVerdict => {
  return { evidence: 'quoted', kind };
};

const build = (counts: Counts, errors = 0): JudgeCalibrationPair[] => {
  const rows: Array<readonly ['fail' | 'pass', 'fail' | 'pass', number]> = [
    ['fail', 'fail', counts.bothFail],
    ['pass', 'pass', counts.bothPass],
    ['fail', 'pass', counts.judgeFailHumanPass],
    ['pass', 'fail', counts.judgePassHumanFail],
  ];
  const pairs: JudgeCalibrationPair[] = [];

  for (const [judge, human, times] of rows) {
    for (let i = 0; i < times; i += 1) {
      pairs.push({
        human,
        judge: verdict(judge),
        subjectId: `${judge}-${human}-${i}`,
      });
    }
  }

  for (let i = 0; i < errors; i += 1) {
    pairs.push({
      human: i % 2 === 0 ? 'fail' : 'pass',
      judge: { kind: 'error', reason: 'judge timed out' },
      subjectId: `error-${i}`,
    });
  }

  return pairs;
};

describe('calibrateJudge', () => {
  // Hand-computed table, n = 20 (judge errors excluded):
  //                 human fail   human pass
  //   judge fail         6            1
  //   judge pass         2           11
  // catch = 6 / 8 = 0.75; false-fail = 1 / 12 = 0.083333...
  // po = (6 + 11) / 20 = 0.85; pe = (7/20)(8/20) + (13/20)(12/20) = 0.14 + 0.39 = 0.53
  // kappa = (0.85 - 0.53) / (1 - 0.53) = 0.32 / 0.47 = 0.680851...
  const table: Counts = {
    bothFail: 6,
    bothPass: 11,
    judgeFailHumanPass: 1,
    judgePassHumanFail: 2,
  };

  it('reproduces the hand-computed kappa, catch rate and false-fail rate', () => {
    const result = calibrateJudge({ pairs: build(table) });

    expect(result.n).toBe(20);
    expect(result.nExcluded).toBe(0);
    expect(result.catchRate).toBeCloseTo(0.75, 12);
    expect(result.falseFailRate).toBeCloseTo(1 / 12, 12);
    expect(result.kappa).toBeCloseTo(0.32 / 0.47, 12);
    expect(result.status).toBe('gating');
  });

  it('reports a bootstrap interval around kappa that is reproducible', () => {
    const first = calibrateJudge({ pairs: build(table) });
    const second = calibrateJudge({ pairs: build(table) });

    expect(first.kappaCiLow).not.toBeNull();
    expect(first.kappaCiLow ?? 0).toBeLessThan(first.kappa ?? 0);
    expect(first.kappaCiHigh ?? 0).toBeGreaterThan(first.kappa ?? 0);
    expect(second).toEqual(first);
  });

  it('changes the interval when the seed changes', () => {
    const base = calibrateJudge({ pairs: build(table) });
    const other = calibrateJudge({
      bootstrap: { seed: 7 },
      pairs: build(table),
    });

    expect(other.kappa).toBe(base.kappa);
    expect(other.kappaCiLow).not.toBe(base.kappaCiLow);
  });

  it('excludes judge error verdicts and counts them separately', () => {
    const result = calibrateJudge({ pairs: build(table, 3) });

    expect(result.n).toBe(20);
    expect(result.nExcluded).toBe(3);
    expect(result.kappa).toBeCloseTo(0.32 / 0.47, 12);
    expect(result.catchRate).toBeCloseTo(0.75, 12);
  });

  describe('status boundaries (n = 20)', () => {
    // Humans are always 10 fail / 10 pass and the judge fails 10 or 11 times, so chance
    // agreement pe is 0.5 and kappa = (po - 0.5) / 0.5 = 2 * po - 1.
    const agreeing = (agree: number): Counts => {
      const tables: Record<number, Counts> = {
        15: {
          bothFail: 8,
          bothPass: 7,
          judgeFailHumanPass: 3,
          judgePassHumanFail: 2,
        },
        16: {
          bothFail: 8,
          bothPass: 8,
          judgeFailHumanPass: 2,
          judgePassHumanFail: 2,
        },
        17: {
          bothFail: 9,
          bothPass: 8,
          judgeFailHumanPass: 2,
          judgePassHumanFail: 1,
        },
        18: {
          bothFail: 9,
          bothPass: 9,
          judgeFailHumanPass: 1,
          judgePassHumanFail: 1,
        },
      };

      return (
        tables[agree] ?? {
          bothFail: 0,
          bothPass: 0,
          judgeFailHumanPass: 0,
          judgePassHumanFail: 0,
        }
      );
    };

    it('is unsupervised at exactly kappa 0.8 (18 / 20 agree)', () => {
      const result = calibrateJudge({ pairs: build(agreeing(18)) });

      expect(result.kappa).toBeCloseTo(0.8, 12);
      expect(result.status).toBe('unsupervised');
    });

    it('is gating just below 0.8 (kappa 0.7, 17 / 20 agree)', () => {
      const result = calibrateJudge({ pairs: build(agreeing(17)) });

      expect(result.kappa).toBeCloseTo(0.7, 12);
      expect(result.status).toBe('gating');
    });

    it('is gating at exactly kappa 0.6 (16 / 20 agree)', () => {
      const result = calibrateJudge({ pairs: build(agreeing(16)) });

      expect(result.kappa).toBeCloseTo(0.6, 12);
      expect(result.status).toBe('gating');
    });

    it('is non_gating just below 0.6 (kappa 0.5, 15 / 20 agree)', () => {
      const result = calibrateJudge({ pairs: build(agreeing(15)) });

      expect(result.kappa).toBeCloseTo(0.5, 12);
      expect(result.status).toBe('non_gating');
    });

    it('is non_gating when kappa is undefined (the judge never fails)', () => {
      const result = calibrateJudge({
        pairs: build({
          bothFail: 0,
          bothPass: 20,
          judgeFailHumanPass: 0,
          judgePassHumanFail: 0,
        }),
      });

      expect(result.kappa).toBeNull();
      expect(result.status).toBe('non_gating');
    });

    it('honours custom thresholds', () => {
      const result = calibrateJudge({
        pairs: build(agreeing(17)),
        thresholds: { unsupervisedKappa: 0.7 },
      });

      expect(result.status).toBe('unsupervised');
    });
  });

  describe('insufficient data', () => {
    it('is insufficient below the default minimum even with perfect agreement', () => {
      const result = calibrateJudge({
        pairs: build({
          bothFail: 10,
          bothPass: 9,
          judgeFailHumanPass: 0,
          judgePassHumanFail: 0,
        }),
      });

      expect(result.n).toBe(19);
      expect(result.kappa).toBe(1);
      expect(result.status).toBe('insufficient');
    });

    it('does not count error verdicts toward the minimum', () => {
      const result = calibrateJudge({
        pairs: build(
          {
            bothFail: 10,
            bothPass: 9,
            judgeFailHumanPass: 0,
            judgePassHumanFail: 0,
          },
          5,
        ),
      });

      expect(result.n).toBe(19);
      expect(result.nExcluded).toBe(5);
      expect(result.status).toBe('insufficient');
    });

    it('is insufficient with no pairs and reports null statistics', () => {
      expect(calibrateJudge({ pairs: [] })).toEqual({
        catchRate: null,
        falseFailRate: null,
        kappa: null,
        kappaCiHigh: null,
        kappaCiLow: null,
        n: 0,
        nExcluded: 0,
        status: 'insufficient',
      });
    });

    it('honours a custom minimum', () => {
      const result = calibrateJudge({
        pairs: build({
          bothFail: 3,
          bothPass: 3,
          judgeFailHumanPass: 0,
          judgePassHumanFail: 0,
        }),
        thresholds: { minPairs: 6 },
      });

      expect(result.status).toBe('unsupervised');
    });
  });
});
