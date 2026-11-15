import { describe, expect, it } from 'vitest';

import {
  PRODUCT_FEATURES,
  PRODUCT_POSITIONING,
  validateRegistry,
} from '../src/index';

describe('the committed registry', () => {
  it('passes every static rule', () => {
    expect(validateRegistry(PRODUCT_FEATURES, PRODUCT_POSITIONING)).toEqual([]);
  });

  it('leads the tagline with "AI-native platform"', () => {
    expect(PRODUCT_POSITIONING.tagline.short).toContain('AI-native platform');
  });
});
