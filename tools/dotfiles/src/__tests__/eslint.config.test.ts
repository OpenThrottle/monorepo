import { describe, expect, it } from 'vitest';

import { eslintConfig } from '@tools/dotfiles';

interface FlatConfigEntry {
  readonly files?: ReadonlyArray<string | readonly string[]>;
  readonly ignores?: readonly string[];
  readonly rules?: Readonly<Record<string, unknown>>;
}

const entries: readonly FlatConfigEntry[] = eslintConfig;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const flattenFiles = (
  files: ReadonlyArray<string | readonly string[]> | undefined,
): readonly string[] =>
  (files ?? []).flatMap((pattern) =>
    Array.isArray(pattern) ? pattern : [pattern],
  );

const selectorsFromRestrictedSyntax = (value: unknown): readonly string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(1)
    .map((option) =>
      isRecord(option) && typeof option.selector === 'string'
        ? option.selector
        : '',
    );
};

const ruleEntry = (ruleName: string): unknown => {
  const match = entries.find(
    (entry) => entry.rules !== undefined && ruleName in entry.rules,
  );

  return match?.rules?.[ruleName];
};

const ruleSeverity = (ruleName: string): unknown => {
  const value = ruleEntry(ruleName);

  return Array.isArray(value) ? value[0] : value;
};

describe('eslintConfig flat config', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(eslintConfig)).toBe(true);
    expect(eslintConfig.length).toBeGreaterThan(0);
  });

  it('errors on no-explicit-any', () => {
    expect(ruleSeverity('@typescript-eslint/no-explicit-any')).toBe('error');
  });

  it('bans `as` assertions via consistent-type-assertions', () => {
    const value = ruleEntry('@typescript-eslint/consistent-type-assertions');

    expect(Array.isArray(value)).toBe(true);
    expect(Array.isArray(value) ? value[0] : undefined).toBe('error');
    const options = Array.isArray(value) ? value[1] : undefined;
    expect(isRecord(options) ? options.assertionStyle : undefined).toBe(
      'never',
    );
  });

  it('bans TypeScript enums via no-restricted-syntax', () => {
    const selectors = selectorsFromRestrictedSyntax(
      ruleEntry('no-restricted-syntax'),
    );

    expect(selectors).toContain('TSEnumDeclaration');
  });

  it('errors on enforce-module-boundaries', () => {
    expect(ruleSeverity('@nx/enforce-module-boundaries')).toBe('error');
  });

  it('bans snapshot assertions inside __tests__', () => {
    const testsEntry = entries.find((entry) =>
      flattenFiles(entry.files).some((pattern) =>
        pattern.includes('__tests__'),
      ),
    );

    expect(testsEntry).toBeDefined();

    const selectors = selectorsFromRestrictedSyntax(
      testsEntry?.rules?.['no-restricted-syntax'],
    );

    const bannedSnapshotMethods = [
      'toMatchInlineSnapshot',
      'toMatchSnapshot',
      'toThrowErrorMatchingInlineSnapshot',
      'toThrowErrorMatchingSnapshot',
    ];

    bannedSnapshotMethods.forEach((method) => {
      expect(selectors.some((selector) => selector.includes(method))).toBe(
        true,
      );
    });
  });

  it('ignores node_modules and __generated__', () => {
    const ignoreEntry = entries.find((entry) => entry.ignores !== undefined);

    expect(ignoreEntry?.ignores).toContain('**/node_modules/**/*');
    expect(ignoreEntry?.ignores).toContain('**/__generated__/**/*');
  });
});
