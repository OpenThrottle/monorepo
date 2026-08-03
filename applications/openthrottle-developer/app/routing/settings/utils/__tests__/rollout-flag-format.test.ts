import { describe, expect, test } from 'vitest';
import {
  formatRolloutAllocationSummary,
  formatRolloutOffVariationLabel,
} from '../rollout-flag-format';

describe('rollout-flag-format', () => {
  test('summarizes fallthrough weights with variation labels', () => {
    const summary = formatRolloutAllocationSummary({
      fallthrough: {
        variations: [
          { variation: 0, weight: 90 },
          { variation: 1, weight: 10 },
        ],
      },
      variations: [
        { description: null, name: 'control', valueJson: 'false' },
        { description: null, name: 'treatment', valueJson: 'true' },
      ],
    });
    expect(summary).toBe('control 90% · treatment 10%');
  });

  test('labels the off variation with name and value', () => {
    const label = formatRolloutOffVariationLabel({
      offVariation: 0,
      variations: [
        { description: null, name: 'control', valueJson: 'false' },
        { description: null, name: null, valueJson: 'true' },
      ],
    });
    expect(label).toBe('control (false)');
  });
});
