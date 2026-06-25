import { describe, expect, it } from 'vitest';

import { createViteConfig, prettierConfig } from '@tools/dotfiles';

import { calculateOutputDir } from '../calculate-output-dir.ts';

describe('calculateOutputDir', () => {
  const cases: ReadonlyArray<{
    readonly expected: string;
    readonly outputBase: string;
    readonly packagePath: string;
  }> = [
    {
      expected: '../../node_modules/.vite/packages/x/y',
      outputBase: 'node_modules/.vite',
      packagePath: '/repo/packages/x/y',
    },
    {
      expected: '../node_modules/.vite/packages/foo',
      outputBase: 'node_modules/.vite',
      packagePath: '/repo/packages/foo',
    },
    {
      expected: '../coverage/tools/dotfiles',
      outputBase: 'coverage',
      packagePath: '/repo/tools/dotfiles',
    },
    {
      // Deeper nesting walks up one `../` per intermediate directory.
      expected: '../../../node_modules/.vite/packages/a/b/c',
      outputBase: 'node_modules/.vite',
      packagePath: '/repo/packages/a/b/c',
    },
  ];

  cases.forEach(({ expected, outputBase, packagePath }) => {
    it(`maps ${packagePath} -> ${expected}`, () => {
      expect(calculateOutputDir(packagePath, outputBase)).toBe(expected);
    });
  });

  it('prefers the last packages/tools segment when nested', () => {
    expect(
      calculateOutputDir('/repo/packages/tools/inner', 'node_modules/.vite'),
    ).toBe('../node_modules/.vite/tools/inner');
  });

  it('throws when neither packages nor tools is present in the path', () => {
    expect(() =>
      calculateOutputDir('/repo/applications/server', 'node_modules/.vite'),
    ).toThrow(/Could not find 'packages' or 'tools'/);
  });
});

describe('prettierConfig invariants', () => {
  it('keeps the base single-quote / 2-space / trailing-comma settings', () => {
    expect(prettierConfig.singleQuote).toBe(true);
    expect(prettierConfig.tabWidth).toBe(2);
    expect(prettierConfig.printWidth).toBe(80);
    expect(prettierConfig.trailingComma).toBe('all');
    expect(prettierConfig.arrowParens).toBe('always');
  });

  it('includes the tailwind class-sorting plugin', () => {
    expect(prettierConfig.plugins).toContain('prettier-plugin-tailwindcss');
  });

  it('pins YAML to single quotes (must stay in sync with .editorconfig)', () => {
    const yamlOverride = prettierConfig.overrides?.find((override) =>
      override.files.includes('*.yaml'),
    );

    expect(yamlOverride).toBeDefined();
    expect(yamlOverride?.files).toContain('*.yml');
    expect(yamlOverride?.options?.singleQuote).toBe(true);
  });
});

describe('createViteConfig', () => {
  it('auto-detects the ts entry and isolates the vite cache dir', () => {
    const config = createViteConfig({
      packagePath: '/repo/packages/x/y',
      packageType: 'node',
    });

    expect(config.cacheDir).toBe('../../node_modules/.vite/packages/x/y');
    expect(config.root).toBe('/repo/packages/x/y');
    expect(config.build?.lib).toBeDefined();
    const lib = config.build?.lib;
    const entry = typeof lib === 'object' ? lib.entry : undefined;
    expect(entry).toContain('src/index.ts');
  });

  it('honours an explicit entry override', () => {
    const config = createViteConfig({
      entry: ['src/main.ts'],
      packagePath: '/repo/tools/dotfiles',
      packageType: 'node',
    });

    const lib = config.build?.lib;
    const entry = typeof lib === 'object' ? lib.entry : undefined;
    expect(entry).toContain('src/main.ts');
    expect(entry).not.toContain('src/index.ts');
  });
});
