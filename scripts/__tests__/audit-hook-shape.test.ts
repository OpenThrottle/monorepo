import { describe, expect, it } from 'vitest';

import {
  analyzeHookFileSource,
  checkAllowlist,
  collectImports,
  findViolations,
  resolveSpecifier,
} from '../audit-hook-shape.ts';

const HOOK = 'packages/x/src/hooks/useFoo.ts';

describe('analyzeHookFileSource', () => {
  it('splits exported hooks from exported values and ignores types', () => {
    const facts = analyzeHookFileSource(
      HOOK,
      [
        'export const LIMIT = 3;',
        'export interface FooResult {}',
        'const local = 1;',
        'export const useFoo = (): number => local;',
        'export function useBar(): void {}',
      ].join('\n'),
    );

    expect(facts.exportedHooks).toEqual(['useBar', 'useFoo']);
    expect(facts.exportedValues).toEqual(['LIMIT']);
  });

  it('reads the line-1 opt-out', () => {
    const facts = analyzeHookFileSource(
      HOOK,
      '/* hook-shape: opt-out — vendored */\nexport const useFoo = (): void => {};',
    );

    expect(facts.optOut).toBe(true);
  });
});

describe('resolveSpecifier', () => {
  const inScope = new Set([
    HOOK,
    'packages/x/src/hooks/index.ts',
    'applications/a/app/global/config/flags.ts',
  ]);

  it('resolves relative, .js-mapped, index and ~/ imports', () => {
    expect(
      resolveSpecifier('packages/x/src/index.ts', './hooks/useFoo.js', inScope),
    ).toBe(HOOK);
    expect(
      resolveSpecifier('packages/x/src/index.ts', './hooks', inScope),
    ).toBe('packages/x/src/hooks/index.ts');
    expect(
      resolveSpecifier(
        'applications/a/app/routes/r.tsx',
        '~/global/config/flags',
        inScope,
      ),
    ).toBe('applications/a/app/global/config/flags.ts');
    expect(resolveSpecifier(HOOK, 'react', inScope)).toBeUndefined();
  });
});

describe('findViolations', () => {
  const run = (files: Readonly<Record<string, string>>): readonly string[] => {
    const entries = Object.entries(files);

    return findViolations(
      entries.map(([file, content]) => analyzeHookFileSource(file, content)),
      entries.flatMap(([file, content]) => collectImports(file, content)),
    ).map((v) => `${v.rule}|${v.file}|${v.symbol ?? ''}`);
  };

  it('flags a kebab-case hook file', () => {
    expect(
      run({
        'packages/x/src/hooks/use-foo.ts':
          'export const useFoo = (): void => {};',
      }),
    ).toEqual(['H6-file-name|packages/x/src/hooks/use-foo.ts|']);
  });

  it('flags a hook exported outside hooks/ but not a conformant one', () => {
    expect(
      run({
        [HOOK]: 'export const useFoo = (): void => {};',
        'packages/x/src/utils/csp.ts':
          'export const useNonce = (): void => {};',
      }),
    ).toEqual(['H6-hook-outside-hooks|packages/x/src/utils/csp.ts|']);
  });

  it('flags a hook-file value imported elsewhere, including via a namespace', () => {
    expect(
      run({
        [HOOK]:
          'export const LIMIT = 3;\nexport const OTHER = 4;\nexport const UNUSED = 5;\nexport const useFoo = (): void => {};',
        'packages/x/src/components/A.tsx':
          "import { LIMIT } from '../hooks/useFoo';",
        'packages/x/src/components/B.tsx':
          "import * as foo from '../hooks/useFoo';\nconsole.log(foo.OTHER);",
      }),
    ).toEqual([
      `H3-imported-constant|${HOOK}|LIMIT`,
      `H3-imported-constant|${HOOK}|OTHER`,
    ]);
  });

  it('skips an opted-out file', () => {
    expect(
      run({
        'packages/x/src/hooks/use-foo.ts':
          '/* hook-shape: opt-out — upstream copy */\nexport const useFoo = (): void => {};',
      }),
    ).toEqual([]);
  });
});

describe('checkAllowlist', () => {
  const violation = {
    file: HOOK,
    message: '',
    rule: 'H6-file-name',
    symbol: undefined,
  } as const;

  it('reports unlisted violations and stale entries', () => {
    const result = checkAllowlist(
      [violation],
      [{ file: 'gone.ts', rule: 'H6-file-name', symbol: undefined }],
    );

    expect(result.unlisted).toEqual([violation]);
    expect(result.stale.map((e) => e.file)).toEqual(['gone.ts']);
  });

  it('passes when the allowlist matches exactly', () => {
    const result = checkAllowlist(
      [violation],
      [{ file: HOOK, rule: 'H6-file-name', symbol: undefined }],
    );

    expect(result.unlisted).toEqual([]);
    expect(result.stale).toEqual([]);
  });
});
