import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  APPEARANCE_BRAND_OVERRIDE_KEYS,
  APPEARANCE_CSS_VARIABLE_KEYS,
  APPEARANCE_THEME_COLOR_TOKEN_KEYS,
  buildAppearanceRootCssBlock,
  CONFIG_STORAGE_KEY,
  cssColorToHex,
  DEFAULT_APPEARANCE_CONFIG,
  DEFAULT_BRAND_HEX,
  DEFAULT_BRAND_HSL,
  getBrandColorInputValue,
  normalizeAppearanceConfig,
} from '../atom.config';

describe('appearance config constants', () => {
  test('CONFIG_STORAGE_KEY is stable for localStorage', () => {
    expect(CONFIG_STORAGE_KEY).toBe(
      'openthrottle-developer:settings:appearance',
    );
  });

  test('DEFAULT_APPEARANCE_CONFIG matches stylesheet defaults', () => {
    expect(DEFAULT_APPEARANCE_CONFIG).toEqual({
      brand: undefined,
      theme: 'light',
    });
  });

  test('DEFAULT_BRAND_HEX matches DEFAULT_BRAND_HSL', () => {
    expect(cssColorToHex(DEFAULT_BRAND_HSL)).toBe(DEFAULT_BRAND_HEX);
  });

  test('APPEARANCE_BRAND_OVERRIDE_KEYS is a subset of APPEARANCE_CSS_VARIABLE_KEYS', () => {
    for (const key of APPEARANCE_BRAND_OVERRIDE_KEYS) {
      expect(APPEARANCE_CSS_VARIABLE_KEYS).toContain(key);
    }
  });

  test('APPEARANCE_THEME_COLOR_TOKEN_KEYS lists @theme aliases fed by brand overrides', () => {
    expect(APPEARANCE_THEME_COLOR_TOKEN_KEYS).toEqual([
      '--color-accent',
      '--color-chart-1',
      '--color-ring',
      '--color-sidebar-primary',
      '--color-sidebar-ring',
    ]);
  });

  test('APPEARANCE_BRAND_OVERRIDE_KEYS targets :root sources not @theme tokens', () => {
    for (const key of APPEARANCE_BRAND_OVERRIDE_KEYS) {
      expect(key.startsWith('--color-')).toBe(false);
    }
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

  describe('when theme is invalid', () => {
    test('falls back to default theme', () => {
      expect(normalizeAppearanceConfig({ theme: 'system' })).toEqual({
        brand: undefined,
        theme: 'light',
      });
    });
  });

  describe('when theme is valid', () => {
    test('preserves dark theme', () => {
      expect(normalizeAppearanceConfig({ theme: 'dark' })).toEqual({
        brand: undefined,
        theme: 'dark',
      });
    });
  });

  describe('when brand is set', () => {
    test('preserves brand string', () => {
      expect(
        normalizeAppearanceConfig({
          brand: 'hsl(120 50% 40%)',
          theme: 'light',
        }),
      ).toEqual({
        brand: 'hsl(120 50% 40%)',
        theme: 'light',
      });
    });
  });

  describe('when legacy accentColor is present', () => {
    test('migrates accentColor to brand', () => {
      expect(
        normalizeAppearanceConfig({
          accentColor: '#ff5500',
          theme: 'dark',
        }),
      ).toEqual({
        brand: '#ff5500',
        theme: 'dark',
      });
    });

    test('prefers brand over accentColor when both exist', () => {
      expect(
        normalizeAppearanceConfig({
          accentColor: '#ff5500',
          brand: '#00ff00',
          theme: 'light',
        }),
      ).toEqual({
        brand: '#00ff00',
        theme: 'light',
      });
    });
  });
});

describe('cssColorToHex', () => {
  describe('when color is hex', () => {
    test('normalizes 6-digit hex to lowercase', () => {
      expect(cssColorToHex('#0088FF')).toBe('#0088ff');
    });

    test('expands 3-digit shorthand hex', () => {
      expect(cssColorToHex('#08f')).toBe('#0088ff');
    });
  });

  describe('when color is hsl', () => {
    test('converts space-separated hsl to hex', () => {
      expect(cssColorToHex(DEFAULT_BRAND_HSL)).toBe(DEFAULT_BRAND_HEX);
    });

    test('converts comma-separated hsl to hex', () => {
      expect(cssColorToHex('hsl(208, 100%, 50%)')).toBe(DEFAULT_BRAND_HEX);
    });
  });

  describe('when color is unsupported', () => {
    test('returns null for named colors', () => {
      expect(cssColorToHex('red')).toBeNull();
    });

    test('returns null for empty string', () => {
      expect(cssColorToHex('   ')).toBeNull();
    });
  });
});

describe('getBrandColorInputValue', () => {
  describe('when brand is undefined', () => {
    test('returns DEFAULT_BRAND_HEX', () => {
      expect(getBrandColorInputValue(undefined)).toBe(DEFAULT_BRAND_HEX);
    });
  });

  describe('when brand is a valid css color', () => {
    test('returns hex for hsl brand', () => {
      expect(getBrandColorInputValue(DEFAULT_BRAND_HSL)).toBe(
        DEFAULT_BRAND_HEX,
      );
    });

    test('returns hex for hex brand', () => {
      expect(getBrandColorInputValue('#ff0000')).toBe('#ff0000');
    });
  });

  describe('when brand cannot be parsed', () => {
    test('falls back to DEFAULT_BRAND_HEX', () => {
      expect(getBrandColorInputValue('not-a-color')).toBe(DEFAULT_BRAND_HEX);
    });
  });
});

describe('buildAppearanceRootCssBlock', () => {
  describe('when brand is undefined', () => {
    test('returns empty string', () => {
      expect(buildAppearanceRootCssBlock(undefined)).toBe('');
    });
  });

  describe('when brand is set', () => {
    test('emits override declarations for brand tokens', () => {
      const brand = 'hsl(208 100% 50%)';
      const block = buildAppearanceRootCssBlock(brand);

      for (const key of APPEARANCE_BRAND_OVERRIDE_KEYS) {
        expect(block).toContain(`${key}: ${brand};`);
      }
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
    });
  });

  test('hydrates invalid persisted JSON as defaults on module init', async () => {
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
    const next = { brand: '#112233', theme: 'dark' as const };

    store.set(configAtom, next);

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
