import { describe, expect, it } from 'vitest';

import { THEME_TOKEN_NAMES } from '../../data/theme-tokens';
import { THEMES } from '../../data/themes';
import { buildThemeStylesheet, getTheme, isThemeId } from '../theme';

describe('theme registry', () => {
  it('includes the OpenThrottle reference theme', () => {
    expect(getTheme('openthrottle')).toBeDefined();
  });

  it('has unique theme ids', () => {
    const ids = THEMES.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('defines every contract token for both light and dark in every theme', () => {
    for (const theme of THEMES) {
      for (const token of THEME_TOKEN_NAMES) {
        expect(theme.light[token], `${theme.id} light ${token}`).toBeTruthy();
        expect(theme.dark[token], `${theme.id} dark ${token}`).toBeTruthy();
      }
    }
  });

  it('isThemeId recognizes registered ids and rejects others', () => {
    expect(isThemeId('openthrottle')).toBe(true);
    expect(isThemeId('not-a-theme')).toBe(false);
    expect(isThemeId(42)).toBe(false);
  });
});

describe('buildThemeStylesheet', () => {
  it('emits light and dark scoped blocks per theme', () => {
    const [sampleTheme] = THEMES;
    if (sampleTheme === undefined) throw new Error('expected a bundled theme');

    const css = buildThemeStylesheet([
      {
        dark: sampleTheme.dark,
        id: 'sample',
        label: 'Sample',
        light: sampleTheme.light,
      },
    ]);

    expect(css).toContain('html[data-theme="sample"] {');
    expect(css).toContain('html[data-theme="sample"].dark {');
    expect(css).toContain('--background:');
    expect(css).toContain('--sidebar-ring:');
  });
});
