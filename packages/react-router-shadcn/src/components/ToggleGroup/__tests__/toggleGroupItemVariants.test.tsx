import { describe, expect, test } from 'vitest';
import { toggleGroupItemVariants } from '../toggleGroupItemVariants';

describe('toggleGroupItemVariants', () => {
  test('returns base toggle item classes', () => {
    expect(toggleGroupItemVariants()).toContain('inline-flex');
    expect(toggleGroupItemVariants()).toContain('rounded-md');
  });

  test('applies size variant', () => {
    expect(toggleGroupItemVariants({ size: 'sm' })).toContain('h-9');
  });

  test('applies outline variant', () => {
    expect(toggleGroupItemVariants({ variant: 'outline' })).toContain(
      'border-input',
    );
  });
});
