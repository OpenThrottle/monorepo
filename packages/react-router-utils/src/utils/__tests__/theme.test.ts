import { describe, expect, test } from 'vitest';

import {
  buildAppearanceRootCssBlock,
  buildThemePrehydrationScript,
  cssColorToHex,
  DEFAULT_BRAND_HEX,
  getBrandColorInputValue,
  isThemeMode,
  resolveThemeMode,
} from '../theme';

describe('isThemeMode', () => {
  test('accepts the three valid modes', () => {
    expect(isThemeMode('light')).toBe(true);
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('system')).toBe(true);
  });

  test('rejects anything else', () => {
    expect(isThemeMode('System')).toBe(false);
    expect(isThemeMode('')).toBe(false);
    expect(isThemeMode(undefined)).toBe(false);
    expect(isThemeMode(null)).toBe(false);
    expect(isThemeMode(0)).toBe(false);
  });
});

describe('resolveThemeMode', () => {
  test('returns explicit modes unchanged regardless of prefersDark', () => {
    expect(resolveThemeMode('light', true)).toBe('light');
    expect(resolveThemeMode('light', false)).toBe('light');
    expect(resolveThemeMode('dark', true)).toBe('dark');
    expect(resolveThemeMode('dark', false)).toBe('dark');
  });

  test('follows prefersDark for system mode', () => {
    expect(resolveThemeMode('system', true)).toBe('dark');
    expect(resolveThemeMode('system', false)).toBe('light');
  });
});

describe('buildThemePrehydrationScript', () => {
  const script = buildThemePrehydrationScript('acme:settings:appearance');

  test('embeds the given storage key', () => {
    expect(script).toContain(JSON.stringify('acme:settings:appearance'));
  });

  test('includes a system branch resolving prefers-color-scheme', () => {
    expect(script).toContain("t==='system'");
    expect(script).toContain('prefers-color-scheme: dark');
    expect(script).toContain('matchMedia');
  });

  test('toggles the dark class both ways', () => {
    expect(script).toContain("classList.add('dark')");
    expect(script).toContain("classList.remove('dark')");
  });

  test('applies the palette via data-theme', () => {
    expect(script).toContain("setAttribute('data-theme'");
  });

  test('resolves the default system theme when no config is stored', () => {
    // Must NOT bail out on a missing config: a fresh user's React tree eagerly
    // renders the resolved `system` theme, so the pre-hydration DOM has to match
    // it (or hydrateRoot(document) reports React #418). The script defaults the
    // theme to `system` instead of returning early.
    expect(script).not.toContain('if(!raw)return');
    expect(script).toContain("||'system'");
  });
});

describe('cssColorToHex / getBrandColorInputValue', () => {
  test('parses hsl and hex colors', () => {
    expect(cssColorToHex('#0088ff')).toBe('#0088ff');
    expect(cssColorToHex('#08f')).toBe('#0088ff');
    expect(cssColorToHex('hsl(208 100% 50%)')).toBe('#0088ff');
  });

  test('returns null for unsupported color strings', () => {
    expect(cssColorToHex('not-a-color')).toBeNull();
  });

  test('falls back to the default hex when brand is unset or unparseable', () => {
    expect(getBrandColorInputValue(undefined)).toBe(DEFAULT_BRAND_HEX);
    expect(getBrandColorInputValue('nonsense')).toBe(DEFAULT_BRAND_HEX);
    expect(getBrandColorInputValue('#123456')).toBe('#123456');
  });
});

describe('buildAppearanceRootCssBlock', () => {
  test('returns an empty string when brand is unset', () => {
    expect(buildAppearanceRootCssBlock(undefined)).toBe('');
  });

  test('emits a declaration for each brand override key', () => {
    const block = buildAppearanceRootCssBlock('hsl(120 50% 50%)');
    expect(block).toContain('--brand: hsl(120 50% 50%);');
    expect(block).toContain('--ring: hsl(120 50% 50%);');
    expect(block).toContain('--sidebar-primary: hsl(120 50% 50%);');
  });
});
