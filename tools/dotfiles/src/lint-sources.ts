import { TSESLint } from '@typescript-eslint/utils';
import tslint from 'typescript-eslint';

import { componentPrimitiveShape } from './rules/componentPrimitiveShape.ts';
import { dataFileShape } from './rules/dataFileShape.ts';
import { longStringTemplateLiteral } from './rules/longStringTemplateLiteral.ts';
import { namedFunctionBlockBody } from './rules/namedFunctionBlockBody.ts';
import { nestjsFileExports } from './rules/nestjsFileExports.ts';
import { nestjsFileNaming } from './rules/nestjsFileNaming.ts';
import { threeLineTernary } from './rules/threeLineTernary.ts';

/** A file to lint in memory: its repo-relative path and its source. */
export interface ReadabilitySource {
  readonly code: string;
  readonly path: string;
}

/**
 * The readability rules (docs/monorepo/code-style.md § Readability), scoped
 * the way `eslintConfig` and `dataFolderEslintConfig` scope them. Parsing is
 * syntax-only — none of these rules needs type information.
 */
const READABILITY_CONFIG: TSESLint.FlatConfig.ConfigArray = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      openthrottle: {
        rules: {
          'component-primitive-shape': componentPrimitiveShape,
          'data-file-shape': dataFileShape,
          'long-string-template-literal': longStringTemplateLiteral,
          'named-function-block-body': namedFunctionBlockBody,
          'three-line-ternary': threeLineTernary,
        },
      },
    },
    rules: {
      'openthrottle/long-string-template-literal': 'error',
      'openthrottle/named-function-block-body': 'error',
      'openthrottle/three-line-ternary': 'error',
    },
  },
  {
    files: ['**/components/**/*.tsx'],
    ignores: ['**/*.test.tsx', '**/__tests__/**'],
    rules: { 'openthrottle/component-primitive-shape': 'error' },
  },
  {
    files: ['**/data/*.ts', '**/data/*.tsx'],
    ignores: ['**/__tests__/**'],
    rules: { 'openthrottle/data-file-shape': 'error' },
  },
];

/**
 * @description Lints sources that exist only in memory (a generator's
 * output tree) with the readability rules, returning one
 * `path:line rule message` string per report — empty when clean.
 */
export const lintReadability = (
  sources: readonly ReadabilitySource[],
): readonly string[] => {
  const linter = new TSESLint.Linter({ configType: 'flat' });

  return sources.flatMap((source) => {
    const messages = linter.verify(source.code, READABILITY_CONFIG, {
      filename: source.path,
    });
    return messages.map((message) => {
      return `${source.path}:${message.line} ${message.ruleId ?? 'parse'} ${message.message}`;
    });
  });
};

/** What {@link lintNestjsFileContract} lints, and against which config. */
export interface NestjsContractLintInput {
  /**
   * The project's flat config — the default export of its `eslint.config.ts`.
   * Only its `files`/`ignores` scoping and its NestJS contract rule entries
   * are kept, so the project's own exceptions (`'off'` blocks) still apply.
   */
  readonly config: readonly unknown[];
  /** The project root, relative to the sources' paths (`packages/nestjs-foo`). */
  readonly projectRoot: string;
  /** Files to lint; anything outside `projectRoot` is skipped. */
  readonly sources: readonly ReadabilitySource[];
}

const RULE_PREFIX = 'openthrottle/nestjs-file-';

/** A virtual workspace root: the config globs resolve against `cwd`, never disk. */
const VIRTUAL_ROOT = '/virtual-workspace';

const BASE_CONFIG: TSESLint.FlatConfig.Config = {
  files: ['**/*.ts'],
  languageOptions: { parser: tslint.parser },
  plugins: {
    openthrottle: {
      rules: {
        'nestjs-file-exports': nestjsFileExports,
        'nestjs-file-naming': nestjsFileNaming,
      },
    },
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isStringArray = (value: unknown): value is string[] => {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
};

const isSeverity = (value: unknown): value is TSESLint.FlatConfig.Severity => {
  return [0, 1, 2, 'error', 'off', 'warn'].some((level) => level === value);
};

/**
 * @description Reduces one flat-config block to its scoping plus its NestJS
 * contract rule entries, or `null` when it carries neither a contract rule
 * nor a global ignore.
 */
const toContractBlock = (block: unknown): TSESLint.FlatConfig.Config | null => {
  if (!isRecord(block)) return null;

  const files = isStringArray(block.files) ? block.files : undefined;
  const ignores = isStringArray(block.ignores) ? block.ignores : undefined;
  const isGlobalIgnore =
    ignores !== undefined &&
    Object.keys(block).every((key) => key === 'ignores');
  if (isGlobalIgnore) return { ignores };

  const rules = isRecord(block.rules) ? block.rules : {};
  const contractRules: Record<string, TSESLint.FlatConfig.Severity> = {};
  for (const [name, entry] of Object.entries(rules)) {
    const severity: unknown = Array.isArray(entry) ? entry[0] : entry;
    if (name.startsWith(RULE_PREFIX) && isSeverity(severity)) {
      contractRules[name] = severity;
    }
  }
  if (Object.keys(contractRules).length === 0) return null;

  return {
    ...(files === undefined ? {} : { files }),
    ...(ignores === undefined ? {} : { ignores }),
    rules: contractRules,
  };
};

/**
 * @description Lints sources that exist only in memory (a generator's
 * output tree) with the NestJS file contract — `nestjs-file-naming` and
 * `nestjs-file-exports` — scoped exactly as the given project config scopes
 * them, and returns one `path:line rule message` string per report at any
 * severity, so a rule still at `warn` fails a test that expects `[]`.
 * @public
 */
export const lintNestjsFileContract = (
  input: NestjsContractLintInput,
): readonly string[] => {
  const { config, projectRoot, sources } = input;
  const cwd = `${VIRTUAL_ROOT}/${projectRoot}`;
  const linter = new TSESLint.Linter({ configType: 'flat', cwd });
  const flatConfig = [
    BASE_CONFIG,
    ...config.flatMap((block) => {
      const contractBlock = toContractBlock(block);
      return contractBlock === null ? [] : [contractBlock];
    }),
  ];

  return sources
    .filter((source) => source.path.startsWith(`${projectRoot}/`))
    .flatMap((source) => {
      const messages = linter.verify(source.code, flatConfig, {
        filename: `${VIRTUAL_ROOT}/${source.path}`,
      });
      return messages.map((message) => {
        return `${source.path}:${message.line} ${message.ruleId ?? 'parse'} ${message.message}`;
      });
    });
};
