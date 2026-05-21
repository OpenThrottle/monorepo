import { describe, expect, it } from 'vitest';
import { tabsTriggerVariants } from '../tabsTriggerVariants';

describe('tabsTriggerVariants', () => {
  it('returns base trigger styles', () => {
    expect(tabsTriggerVariants()).toContain('relative');
    expect(tabsTriggerVariants()).toContain('inline-flex');
    expect(tabsTriggerVariants()).toContain(
      'data-[state=active]:bg-background',
    );
  });
});
