import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  CONFIG_STORAGE_KEY,
  DEFAULT_APPEARANCE_CONFIG,
  normalizeAppearanceConfig,
} from '../atom.config';

// The pure brand/CSS helpers (cssColorToHex, getBrandColorInputValue,
// buildAppearanceRootCssBlock, APPEARANCE_* keys) now live in and are tested by
// @openthrottle/react-router-utils. This suite covers only what atom.config
// still owns: the config shape, normalizeAppearanceConfig, and configAtom.

describe('appearance config constants', () => {
  test('CONFIG_STORAGE_KEY is stable for localStorage', () => {
    expect(CONFIG_STORAGE_KEY).toBe(
      'openthrottle-developer:settings:appearance',
    );
  });

  test('DEFAULT_APPEARANCE_CONFIG defaults theme to system', () => {
    expect(DEFAULT_APPEARANCE_CONFIG).toEqual({
      brand: undefined,
      theme: 'system',
      themeId: undefined,
    });
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
        theme: 'light',
        themeId: undefined,
      });
    });

    test('migrates legacy accentColor to brand', () => {
      expect(
        normalizeAppearanceConfig({ accentColor: '#ff5500', theme: 'dark' }),
      ).toEqual({ brand: '#ff5500', theme: 'dark', themeId: undefined });
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

describe('configAtom localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  test('hydrates legacy persisted JSON on module init', async () => {
    localStorage.setItem(
      CONFIG_STORAGE_KEY,
      JSON.stringify({ accentColor: '#aabbcc', theme: 'dark' }),
    );

    const { configAtom } = await import('../atom.config');
    const { createStore } = await import('jotai/vanilla');
    const store = createStore();

    expect(store.get(configAtom)).toEqual({
      brand: '#aabbcc',
      theme: 'dark',
      themeId: undefined,
    });
  });

  test('hydrates a persisted system theme on module init', async () => {
    localStorage.setItem(
      CONFIG_STORAGE_KEY,
      JSON.stringify({ theme: 'system' }),
    );

    const { configAtom } = await import('../atom.config');
    const { createStore } = await import('jotai/vanilla');
    const store = createStore();

    expect(store.get(configAtom).theme).toBe('system');
  });

  test('hydrates invalid persisted JSON as defaults (system) on module init', async () => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ theme: 'nope' }));

    const { configAtom } = await import('../atom.config');
    const { createStore } = await import('jotai/vanilla');
    const store = createStore();

    expect(store.get(configAtom)).toEqual(DEFAULT_APPEARANCE_CONFIG);
  });

  test('persists updates under CONFIG_STORAGE_KEY', async () => {
    const { configAtom } = await import('../atom.config');
    const { createStore } = await import('jotai/vanilla');
    const store = createStore();

    store.set(configAtom, {
      brand: '#112233',
      theme: 'dark',
      themeId: undefined,
    });

    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw ?? '{}') as {
      brand: string;
      theme: string;
    };
    expect(parsed.brand).toBe('#112233');
    expect(parsed.theme).toBe('dark');
  });
});
