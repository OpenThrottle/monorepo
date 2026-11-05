import { describe, expect, test } from 'vitest';

import { DEFAULT_APPEARANCE_CONFIG } from '~/global/data/data.appearance-config';

import { normalizeAppearanceConfig } from '../appearance-config';

describe('reducedMotion coercion', () => {
  test('preserves always', () => {
    expect(
      normalizeAppearanceConfig({ reducedMotion: 'always' }).reducedMotion,
    ).toBe('always');
  });

  test('round-trips system', () => {
    expect(
      normalizeAppearanceConfig({ reducedMotion: 'system' }).reducedMotion,
    ).toBe('system');
  });

  test('migrates a payload persisted before the key existed', () => {
    expect(
      normalizeAppearanceConfig({ brand: '#ff5500', theme: 'dark' }),
    ).toEqual({
      brand: '#ff5500',
      reducedMotion: 'system',
      theme: 'dark',
      themeId: undefined,
    });
  });

  test('falls back to the default for an unknown value', () => {
    expect(
      normalizeAppearanceConfig({ reducedMotion: 'never' }).reducedMotion,
    ).toBe('system');
  });
});

describe('normalizeAppearanceConfig', () => {
  describe('when value is not a plain object', () => {
    test('returns defaults for null', () => {
      expect(normalizeAppearanceConfig(null)).toEqual(
        DEFAULT_APPEARANCE_CONFIG,
      );
    });

    test('returns defaults for undefined', () => {
      expect(normalizeAppearanceConfig(undefined)).toEqual(
        DEFAULT_APPEARANCE_CONFIG,
      );
    });

    test('returns defaults for a string', () => {
      expect(normalizeAppearanceConfig('light')).toEqual(
        DEFAULT_APPEARANCE_CONFIG,
      );
    });
  });

  describe('theme coercion', () => {
    test('round-trips system', () => {
      expect(normalizeAppearanceConfig({ theme: 'system' }).theme).toBe(
        'system',
      );
    });

    test('preserves light', () => {
      expect(normalizeAppearanceConfig({ theme: 'light' }).theme).toBe('light');
    });

    test('preserves dark', () => {
      expect(normalizeAppearanceConfig({ theme: 'dark' }).theme).toBe('dark');
    });

    test('falls back to the system default for a garbage theme', () => {
      expect(normalizeAppearanceConfig({ theme: 'nope' }).theme).toBe('system');
    });
  });

  describe('brand + legacy migration', () => {
    test('preserves a brand string', () => {
      expect(
        normalizeAppearanceConfig({
          brand: 'hsl(120 50% 40%)',
          theme: 'light',
        }),
      ).toEqual({
        brand: 'hsl(120 50% 40%)',
        reducedMotion: 'system',
        theme: 'light',
        themeId: undefined,
      });
    });

    test('migrates legacy accentColor to brand', () => {
      expect(
        normalizeAppearanceConfig({ accentColor: '#ff5500', theme: 'dark' }),
      ).toEqual({
        brand: '#ff5500',
        reducedMotion: 'system',
        theme: 'dark',
        themeId: undefined,
      });
    });

    test('prefers brand over accentColor when both exist', () => {
      expect(
        normalizeAppearanceConfig({
          accentColor: '#ff5500',
          brand: '#00ff00',
          theme: 'light',
        }).brand,
      ).toBe('#00ff00');
    });
  });

  describe('pluggable themeId predicate', () => {
    test('drops an unknown themeId under the default predicate', () => {
      expect(
        normalizeAppearanceConfig({
          theme: 'system',
          themeId: 'not-a-real-theme',
        }).themeId,
      ).toBeUndefined();
    });

    test('keeps a themeId the supplied predicate accepts', () => {
      expect(
        normalizeAppearanceConfig(
          { theme: 'system', themeId: 'my-palette' },
          () => true,
        ).themeId,
      ).toBe('my-palette');
    });

    test('drops a non-string themeId even when the predicate is permissive', () => {
      expect(
        normalizeAppearanceConfig({ theme: 'system', themeId: 123 }, () => true)
          .themeId,
      ).toBeUndefined();
    });
  });
});
