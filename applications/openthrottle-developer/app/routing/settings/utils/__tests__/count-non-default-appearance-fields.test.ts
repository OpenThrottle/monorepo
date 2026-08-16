import { describe, expect, test } from 'vitest';
import { countNonDefaultAppearanceFields } from '../count-non-default-appearance-fields';
import { DEFAULT_APPEARANCE_CONFIG } from '~/global/data/atom.config';

describe('countNonDefaultAppearanceFields', () => {
  test('counts nothing for the default config', () => {
    expect(countNonDefaultAppearanceFields(DEFAULT_APPEARANCE_CONFIG)).toBe(0);
  });

  test('counts a single changed field', () => {
    expect(
      countNonDefaultAppearanceFields({
        ...DEFAULT_APPEARANCE_CONFIG,
        theme: 'dark',
      }),
    ).toBe(1);
  });

  test('counts every changed field', () => {
    expect(
      countNonDefaultAppearanceFields({
        brand: '#ff5500',
        reducedMotion: 'always',
        theme: 'dark',
        themeId: 'openthrottle',
      }),
    ).toBe(4);
  });
});
