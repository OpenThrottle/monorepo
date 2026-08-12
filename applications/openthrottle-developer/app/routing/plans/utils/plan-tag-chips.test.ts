import { describe, expect, test } from 'vitest';
import type { PlanTagChipData } from '~/routing/plans/components/PlanTagChips';
import { formatPlanTagProvenance } from './plan-tag-chips';

const baseTag: PlanTagChipData = {
  dimension: 'domain',
  source: 'human',
  tag: 'billing',
};

describe('formatPlanTagProvenance', () => {
  test('includes confidence when present', () => {
    const tag: PlanTagChipData = { ...baseTag, confidence: 0.87 };
    expect(formatPlanTagProvenance(tag)).toBe('human · confidence 0.87');
  });

  test('includes confidence when zero (not treated as absent)', () => {
    const tag: PlanTagChipData = { ...baseTag, confidence: 0 };
    expect(formatPlanTagProvenance(tag)).toBe('human · confidence 0');
  });

  test('returns just the source when confidence is null', () => {
    const tag: PlanTagChipData = { ...baseTag, confidence: null };
    expect(formatPlanTagProvenance(tag)).toBe('human');
  });

  test('returns just the source when confidence is undefined', () => {
    expect(formatPlanTagProvenance(baseTag)).toBe('human');
  });
});
