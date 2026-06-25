import { getDirname } from './vite-config.ts';
import js from '@eslint/js';
import pluginImport from 'eslint-plugin-import';
import pluginImportSort from 'eslint-plugin-simple-import-sort';
import pluginJest from 'eslint-plugin-jest';
import pluginNx from '@nx/eslint-plugin';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import tslint from 'typescript-eslint';
// These plugins ship no types; ambient `declare module` shims in src/types.d.ts
// satisfy the resolver (see tsconfig.lib.json include).
import pluginComments from 'eslint-plugin-eslint-comments';
import pluginJson from 'eslint-plugin-json';
import pluginSortKeys from 'eslint-plugin-sort-keys-fix';
import pluginTypescriptSortKeys from 'eslint-plugin-typescript-sort-keys';

/** @publicApi */
export type { Config as EslintFlatConfig } from 'eslint/config';
/** @publicApi */
export { prettierConfig } from './prettier-config.ts';
/** @publicApi */
export {
  createViteConfig,
  defineViteConfig,
  getDirname,
  type CreateViteConfigOptions,
  type PackageType,
} from './vite-config.ts';
/** @publicApi */
export {
  createVitestConfig,
  createVitestConfigJsdom,
  createVitestConfigHappyDom,
  createVitestConfigNode,
  type CreateVitestConfigOptions,
  type TestEnvironment,
} from './vitest-config.ts';

/**
 * ESLint and the new "flat config" system
 * @link https://eslint.org/docs/latest
 * @link https://eslint.org/blog/2022/08/new-config-system-part-2/
 * @publicApi
 */
export const eslintConfig = tslint.config([
  /**
   * To completely ignore a set of files we use a config with only ignores
   * @link https://eslint.org/docs/latest/use/configure/configuration-files#excluding-files-with-ignores
   */
  {
    ignores: [
      '**/*.d.ts',
      '**/__generated__/**/*',
      '**/.cache/**/*',
      '**/.cursor/**/*',
      '**/.git/**/*',
      '**/.github/**/*',
      '**/.husky/**/*',
      '**/.nx/**/*',
      '**/.react-router/**/*',
      '**/.venv/**/*',
      '**/.vscode/**/*',
      '**/build/**/*',
      '**/dist/**/*',
      '**/node_modules/**/*',
      '**/public/worker.js',
      '**/tools/generators/src/generators/*/files/**/*',
      '**/vite.config.ts.timestamp-*.mjs',
      '**/vitest.config.ts.timestamp-*.mjs',
    ],
  },

  /**
   * @link https://nx.dev/nx-api/eslint-plugin/documents/enforce-module-boundaries
   */
  {
    files: ['*.js', '*.jsx', '*.ts', '*.tsx'],
    rules: {
      '@nx/dependency-checks': 'error',
      '@nx/enforce-module-boundaries': [
        'error',
        {
          allow: [],
          depConstraints: [
            {
              onlyDependOnLibsWithTags: ['type:package'],
              sourceTag: 'type:application',
            },
            {
              onlyDependOnLibsWithTags: ['type:package'],
              sourceTag: 'type:package',
            },
            {
              onlyDependOnLibsWithTags: ['type:package', 'type:tool'],
              sourceTag: 'type:tool',
            },
            {
              notDependOnLibsWithTags: ['production:false'],
              sourceTag: 'production:true',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['*.js', '*.jsx', '*.ts', '*.tsx'],
  },

  js.configs.recommended,
  ...tslint.configs.recommended,

  {
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        globals: {
          process: true,
        },
        tsconfigRootDir:
          typeof import.meta !== 'undefined' && import.meta.url
            ? getDirname(import.meta.url)
            : __dirname,
      },
    },

    linterOptions: {
      reportUnusedDisableDirectives: true,
    },

    plugins: {
      '@nx': pluginNx,
      comments: pluginComments,
      import: pluginImport,
      jest: pluginJest,
      json: pluginJson,
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      'simple-import-sort': pluginImportSort,
      'sort-keys-fix': pluginSortKeys,
      'typescript-sort-keys': pluginTypescriptSortKeys,
    },

    rules: {
      // Temporarily relaxed to 'warn': raising these to 'error' (see the
      // dotfiles audit-remediation work) turned ~32 consuming projects CI-red
      // for pre-existing `any`/`as` usage that was never cleaned up. Tracked for
      // proper remediation + re-escalation to 'error' as an OT bug.
      '@typescript-eslint/consistent-type-assertions': [
        'warn',
        { assertionStyle: 'never' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      curly: ['error', 'multi-line'],
      'import/no-named-as-default-member': 'off',
      'no-await-in-loop': 'error',
      'no-console': 'off',
      // Discourage the "no new TypeScript enums — use `as const` objects" rule
      // from CLAUDE.md at the config layer. Temporarily 'warn' (not 'error'):
      // the selector matches all enums, not just new ones, so pre-existing enums
      // across consuming projects would fail CI. Tracked for cleanup +
      // re-escalation to 'error' as an OT bug.
      'no-restricted-syntax': [
        'warn',
        {
          message: `Avoid TypeScript enums. Use an \`as const\` object instead (existing enums are grandfathered).`,
          selector: 'TSEnumDeclaration',
        },
      ],
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'react/jsx-boolean-value': ['error', 'always'],
      'react/jsx-curly-brace-presence': ['error', 'never'],
      'react/jsx-sort-props': 'error',
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'sort-keys': [
        'error',
        'asc',
        { caseSensitive: true, minKeys: 2, natural: false },
      ],
      'sort-keys-fix/sort-keys-fix': 'error',
      'typescript-sort-keys/interface': 'error',
      'typescript-sort-keys/string-enum': 'error',
    },
  },

  /**
   * Prefer Testing Library-style assertions over Jest/Vitest snapshots under __tests__.
   */
  {
    files: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          message: `Avoid TypeScript enums. Use an \`as const\` object instead (existing enums are grandfathered).`,
          selector: 'TSEnumDeclaration',
        },
        {
          message: `Avoid snapshot tests in __tests__. Prefer getByRole/getByText and assertions on visible behavior.`,
          selector: `CallExpression[callee.type="MemberExpression"][callee.property.name="toMatchSnapshot"]`,
        },
        {
          message: `Avoid inline snapshot tests in __tests__. Prefer explicit assertions on behavior.`,
          selector: `CallExpression[callee.type="MemberExpression"][callee.property.name="toMatchInlineSnapshot"]`,
        },
        {
          message: `Avoid error snapshot tests in __tests__. Prefer explicit error assertions.`,
          selector: `CallExpression[callee.type="MemberExpression"][callee.property.name="toThrowErrorMatchingSnapshot"]`,
        },
        {
          message: `Avoid inline error snapshot tests in __tests__. Prefer explicit error assertions.`,
          selector: `CallExpression[callee.type="MemberExpression"][callee.property.name="toThrowErrorMatchingInlineSnapshot"]`,
        },
      ],
    },
  },
]);
