import { describe, expect, it } from 'vitest';

import {
  PRODUCT_FEATURES,
  PRODUCT_POSITIONING,
  PRODUCT_PROJECTS,
  validateProjects,
  validateRegistry,
} from '../src/index';

describe('the committed registry', () => {
  it('passes every static rule', () => {
    expect(validateRegistry(PRODUCT_FEATURES, PRODUCT_POSITIONING)).toEqual([]);
  });

  it('lists projects that pass every static rule', () => {
    expect(validateProjects(PRODUCT_PROJECTS)).toEqual([]);
  });

  it('gives every feature and pillar exactly one emoji grapheme', () => {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

    for (const entry of [...PRODUCT_FEATURES, ...PRODUCT_POSITIONING.pillars]) {
      expect([...segmenter.segment(entry.emoji)], entry.id).toHaveLength(1);
    }
  });

  it('leads the tagline with "AI-native platform"', () => {
    expect(PRODUCT_POSITIONING.tagline.short).toContain('AI-native platform');
  });
});
