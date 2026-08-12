import { describe, expect, test } from 'vitest';
import { skillUsageChipClass } from './skill-usage-chip-class';

describe('skillUsageChipClass', () => {
  test('applies the active (selected) treatment when active', () => {
    expect(skillUsageChipClass(true)).toBe(
      'rounded-full border px-3 py-1 text-xs transition-colors border-primary bg-primary text-primary-foreground',
    );
  });

  test('applies the inactive treatment when not active', () => {
    expect(skillUsageChipClass(false)).toBe(
      'rounded-full border px-3 py-1 text-xs transition-colors text-muted-foreground hover:text-foreground border-border',
    );
  });
});
