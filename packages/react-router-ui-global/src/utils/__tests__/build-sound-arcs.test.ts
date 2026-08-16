import { describe, expect, test } from 'vitest';
import { buildSoundArcs } from '../build-sound-arcs';

const quiet = {
  noise: 0,
  seed: 1,
} as const;

const yAt = (
  arcs: ReturnType<typeof buildSoundArcs>,
  pointIndex: 0 | 3,
): number[] => arcs.map((arc) => arc.points[pointIndex][1]);

const spread = (values: number[]): number =>
  Math.max(...values) - Math.min(...values);

describe('buildSoundArcs', () => {
  describe('when n is omitted', () => {
    test('returns three stacked arcs', () => {
      expect(buildSoundArcs()).toHaveLength(3);
    });
  });

  describe('when n is set', () => {
    test('returns that many cubic arcs', () => {
      const arcs = buildSoundArcs({
        distributionEnd: 0.3,
        distributionStart: 0.3,
        n: 5,
        ...quiet,
      });

      expect(arcs).toHaveLength(5);

      for (const arc of arcs) {
        expect(arc.points).toHaveLength(4);
      }
    });

    test('clamps a non-positive count to a single arc', () => {
      expect(
        buildSoundArcs({
          distributionEnd: 0,
          distributionStart: 0,
          n: 0,
          ...quiet,
        }),
      ).toHaveLength(1);
    });
  });

  describe('when distribution is zero', () => {
    test('packs every entry and exit onto the lead path', () => {
      const arcs = buildSoundArcs({
        distributionEnd: 0,
        distributionStart: 0,
        n: 6,
        ...quiet,
      });

      expect(spread(yAt(arcs, 0))).toBeCloseTo(0);
      expect(spread(yAt(arcs, 3))).toBeCloseTo(0);
      expect(arcs[0]?.points[0]).toEqual([-0.06, 0.98]);
      expect(arcs[0]?.points[3]).toEqual([1.06, -0.04]);
    });
  });

  describe('when start and end distribution differ', () => {
    test('spreads only the left side when distributionStart is 1', () => {
      const arcs = buildSoundArcs({
        distributionEnd: 0,
        distributionStart: 1,
        n: 6,
        ...quiet,
      });

      expect(spread(yAt(arcs, 0))).toBeGreaterThan(0.5);
      expect(spread(yAt(arcs, 3))).toBeCloseTo(0);
    });

    test('spreads only the right side when distributionEnd is 1', () => {
      const arcs = buildSoundArcs({
        distributionEnd: 1,
        distributionStart: 0,
        n: 6,
        ...quiet,
      });

      expect(spread(yAt(arcs, 0))).toBeCloseTo(0);
      expect(spread(yAt(arcs, 3))).toBeGreaterThan(0.5);
    });

    test('a higher distribution covers more of the edge', () => {
      const tight = buildSoundArcs({
        distributionEnd: 0.2,
        distributionStart: 0.2,
        n: 6,
        ...quiet,
      });
      const wide = buildSoundArcs({
        distributionEnd: 1,
        distributionStart: 1,
        n: 6,
        ...quiet,
      });

      expect(spread(yAt(wide, 0))).toBeGreaterThan(spread(yAt(tight, 0)));
      expect(spread(yAt(wide, 3))).toBeGreaterThan(spread(yAt(tight, 3)));
    });

    test('a negative distribution mirrors the positive fan', () => {
      const plus = buildSoundArcs({
        distributionEnd: 1,
        distributionStart: 1,
        n: 6,
        ...quiet,
      });
      const minus = buildSoundArcs({
        distributionEnd: -1,
        distributionStart: -1,
        n: 6,
        ...quiet,
      });

      expect(spread(yAt(minus, 0))).toBeCloseTo(spread(yAt(plus, 0)));
      expect(spread(yAt(minus, 3))).toBeCloseTo(spread(yAt(plus, 3)));
      expect(minus[0]?.points[0][1]).toBeCloseTo(
        plus[plus.length - 1]?.points[0][1] ?? Number.NaN,
      );
    });

    test('clamps distribution outside -1..1', () => {
      const capped = buildSoundArcs({
        distributionEnd: 1,
        distributionStart: -1,
        n: 6,
        ...quiet,
      });
      const overflow = buildSoundArcs({
        distributionEnd: 4,
        distributionStart: -4,
        n: 6,
        ...quiet,
      });

      expect(yAt(overflow, 0)).toEqual(yAt(capped, 0));
      expect(yAt(overflow, 3)).toEqual(yAt(capped, 3));
    });
  });

  describe('when noise is applied', () => {
    test('is deterministic for a given seed', () => {
      const options = {
        distributionEnd: 0.4,
        distributionStart: 0.4,
        n: 4,
        noise: 0.03,
        seed: 0xabc,
      };

      expect(buildSoundArcs(options)).toEqual(buildSoundArcs(options));
    });

    test('nudges handles away from the noiseless stack', () => {
      const packed = {
        distributionEnd: 0.3,
        distributionStart: 0.3,
        n: 3,
      };
      const silent = buildSoundArcs({ ...packed, noise: 0, seed: 7 });
      const noisy = buildSoundArcs({ ...packed, noise: 0.04, seed: 7 });

      expect(noisy[1]?.points[1]).not.toEqual(silent[1]?.points[1]);
    });
  });
});
