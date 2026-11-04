import { eslintConfig } from '@tools/dotfiles';
import { describe, expect, it } from 'vitest';

interface FlatConfigEntry {
  readonly files?: ReadonlyArray<string | readonly string[]>;
  readonly ignores?: readonly string[];
  readonly rules?: Readonly<Record<string, unknown>>;
}

const entries: readonly FlatConfigEntry[] = eslintConfig;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const flattenFiles = (
  files: ReadonlyArray<string | readonly string[]> | undefined,
): readonly string[] => {
  return (files ?? []).flatMap((pattern) =>
    Array.isArray(pattern) ? pattern : [pattern],
  );
};

const selectorsFromRestrictedSyntax = (value: unknown): readonly string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(1).map((option) => {
    if (isRecord(option) && typeof option.selector === 'string') {
      return option.selector;
    }

    return '';
  });
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

  it('bans clsx imports, except inside react-router-shadcn', () => {
    const value = ruleEntry('no-restricted-imports');
    const options = Array.isArray(value) ? value[1] : undefined;
    const paths =
      isRecord(options) && Array.isArray(options.paths) ? options.paths : [];

    expect(Array.isArray(value) ? value[0] : undefined).toBe('error');
    expect(paths.some((path) => isRecord(path) && path.name === 'clsx')).toBe(
      true,
    );

    const shadcnEntry = entries.find(
      (entry) =>
        entry.rules?.['no-restricted-imports'] === 'off' &&
        flattenFiles(entry.files).some((pattern) =>
          pattern.includes('packages/react-router-shadcn'),
        ),
    );

    expect(shadcnEntry).toBeDefined();
  });

  it('bans template-literal className expressions in source and tests', () => {
    const testsEntry = entries.find((entry) =>
      flattenFiles(entry.files).some((pattern) =>
        pattern.includes('__tests__'),
      ),
    );
    const isTemplateLiteralSelector = (selector: string): boolean => {
      return (
        selector.includes("JSXAttribute[name.name='className']") &&
        selector.includes('TemplateLiteral')
      );
    };

    expect(
      selectorsFromRestrictedSyntax(ruleEntry('no-restricted-syntax')).some(
        isTemplateLiteralSelector,
      ),
    ).toBe(true);
    expect(
      selectorsFromRestrictedSyntax(
        testsEntry?.rules?.['no-restricted-syntax'],
      ).some(isTemplateLiteralSelector),
    ).toBe(true);
  });

  it('errors on the hook primitive shape, scoped to hook files', () => {
    expect(ruleSeverity('openthrottle/hook-primitive-shape')).toBe('error');

    const hookEntry = entries.find(
      (entry) =>
        entry.rules !== undefined &&
        'openthrottle/hook-primitive-shape' in entry.rules,
    );

    expect(flattenFiles(hookEntry?.files)).toContain('**/hooks/use*.{ts,tsx}');
    expect(hookEntry?.ignores).toContain('**/__tests__/**');
    expect(hookEntry?.ignores).toContain('**/packages/react-router-shadcn/**');
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

  it('errors on the anti-flake rules in colocated and __tests__ test files', () => {
    const antiFlakeRules = [
      'openthrottle/no-fire-event',
      'openthrottle/no-per-test-timeout',
      'openthrottle/no-test-sleep',
      'openthrottle/no-wall-clock-in-tests',
      'openthrottle/skip-requires-issue',
    ];

    antiFlakeRules.forEach((ruleName) => {
      const entry = entries.find(
        (candidate) =>
          candidate.rules !== undefined && ruleName in candidate.rules,
      );

      expect(ruleSeverity(ruleName)).toBe('error');
      expect(flattenFiles(entry?.files)).toContain('**/*.{test,spec}.{ts,tsx}');
      expect(flattenFiles(entry?.files)).toContain('**/__tests__/**/*.ts');
    });

    [
      'openthrottle/no-per-test-timeout',
      'openthrottle/no-test-sleep',
      'openthrottle/no-wall-clock-in-tests',
    ].forEach((ruleName) => {
      const clockEntry = entries.find(
        (entry) => entry.rules !== undefined && ruleName in entry.rules,
      );

      expect(clockEntry?.ignores).toContain(
        '**/*.integration.{test,spec}.{ts,tsx}',
      );
    });
  });

  it('errors on the agent-safety rules, exempting tests from the chokepoints', () => {
    const entryFor = (ruleName: string): FlatConfigEntry | undefined =>
      entries.find(
        (entry) => entry.rules !== undefined && ruleName in entry.rules,
      );

    expect(ruleSeverity('openthrottle/disable-requires-reason')).toBe('error');
    expect(entryFor('openthrottle/disable-requires-reason')?.ignores).toBe(
      undefined,
    );

    [
      'openthrottle/agent-cli-spawn-chokepoint',
      'openthrottle/mcp-tool-registration',
    ].forEach((ruleName) => {
      expect(ruleSeverity(ruleName)).toBe('error');
      expect(entryFor(ruleName)?.ignores).toContain('**/__tests__/**');
      expect(entryFor(ruleName)?.ignores).toContain(
        '**/*.{test,spec}.{ts,tsx}',
      );
    });
  });

  it('ignores node_modules and __generated__', () => {
    const ignoreEntry = entries.find((entry) => entry.ignores !== undefined);

    expect(ignoreEntry?.ignores).toContain('**/node_modules/**/*');
    expect(ignoreEntry?.ignores).toContain('**/__generated__/**/*');
  });

  it('skips GraphQL alphabetize for files under __generated__', () => {
    const graphqlEntry = entries.find((entry) =>
      flattenFiles(entry.files).some((pattern) => pattern.endsWith('.graphql')),
    );

    expect(graphqlEntry).toBeDefined();
    expect(graphqlEntry?.ignores).toContain('**/__generated__/**');
    expect(graphqlEntry?.rules?.['@graphql-eslint/alphabetize']).toBeDefined();
  });
});
