import { TSESLint } from '@typescript-eslint/utils';
import tslint from 'typescript-eslint';

import { componentPrimitiveShape } from './rules/component-primitive-shape.ts';
import { dataFileShape } from './rules/data-file-shape.ts';
import { longStringTemplateLiteral } from './rules/long-string-template-literal.ts';
import { namedFunctionBlockBody } from './rules/named-function-block-body.ts';
import { threeLineTernary } from './rules/three-line-ternary.ts';

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
