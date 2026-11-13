import { describe, expect, it } from 'vitest';

import { buildThemeSafelist, getThemeColorNames } from '../buildThemeSafelist';
import { THEME_TOKEN_NAMES } from '../theme-contract';

describe('getThemeColorNames', () => {
  it('maps every theme token to a color name', () => {
    const names = getThemeColorNames();

    for (const token of THEME_TOKEN_NAMES) {
      const expected = token === 'sidebar-background' ? 'sidebar' : token;
      expect(names).toContain(expected);
    }
  });

  it('is alphabetized and free of duplicates', () => {
    const names = getThemeColorNames();

    expect([...names].sort()).toEqual(names);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('buildThemeSafelist', () => {
  it('emits one @source inline rule for the base and hover utilities', () => {
    const css = buildThemeSafelist();

    expect(css.match(/@source inline\(/g)).toHaveLength(2);
    expect(css).toContain(`'hover:{bg,border,text}-{`);
  });

  it('matches the committed src/theme-safelist.css', async () => {
    await expect(buildThemeSafelist()).toMatchFileSnapshot(
      '../../theme-safelist.css',
    );
  });
});
