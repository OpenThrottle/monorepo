import { componentPrimitiveShape } from './rules/component-primitive-shape.ts';
import { routePrimitiveShape } from './rules/route-primitive-shape.ts';
import { getDirname } from './vite-config.ts';
import graphqlEslint, {
  parser as graphqlParser,
} from '@graphql-eslint/eslint-plugin';
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
import type { Linter } from 'eslint';

/** @public */
export type { Config as EslintFlatConfig } from 'eslint/config';
/** @public */
export { prettierConfig } from './prettier-config.ts';
/** @public */
export {
  createViteConfig,
  defineViteConfig,
  getDirname,
  type CreateViteConfigOptions,
  type PackageType,
} from './vite-config.ts';
/** @public */
export {
  createVitestConfig,
  createVitestConfigJsdom,
  createVitestConfigHappyDom,
  createVitestConfigNode,
  type CreateVitestConfigOptions,
  type TestEnvironment,
} from './vitest-config.ts';

/**
 * ESLint processor that drops `.graphql` documents with no lintable content so
 * the graphql-eslint parser is never handed one it throws on. The parser errors
 * on both empty files and documents that contain only `#` comments (no
 * definitions) — both are common placeholders under the `.tsx.graphql`
 * co-location convention. A document is "meaningful" once it has a non-blank,
 * non-comment line; only then is it linted (as a single block, so the parser
 * and rules run normally). `supportsAutofix` keeps `eslint --fix` working
 * through the processor.
 */
const skipEmptyGraphqlProcessor: Linter.Processor = {
  meta: { name: 'skip-empty-graphql', version: '1.0.0' },
  postprocess(messages) {
    return messages.flat();
  },
  preprocess(code) {
    const hasContent = code
      .split('\n')
      .map((line) => line.trim())
      .some((line) => line.length > 0 && !line.startsWith('#'));
    return hasContent ? [code] : [];
  },
  supportsAutofix: true,
};

/**
 * ESLint and the new "flat config" system
 * @link https://eslint.org/docs/latest
 * @link https://eslint.org/blog/2022/08/new-config-system-part-2/
 * @public
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
    files: [
      '**/*.cjs',
      '**/*.js',
      '**/*.jsx',
      '**/*.mjs',
      '**/*.ts',
      '**/*.tsx',
    ],

    // Module boundaries are a production-code concern. Test files legitimately
    // import their own package's public entry (e.g. *PackageExports* tests that
    // assert the barrel resolves), which the same-project relative-import check
    // would flag; exclude test files from boundary enforcement.
    ignores: [
      '**/__tests__/**',
      '**/*.test.js',
      '**/*.test.jsx',
      '**/*.test.ts',
      '**/*.test.tsx',
    ],
    rules: {
      '@nx/dependency-checks': 'error',
      '@nx/enforce-module-boundaries': [
        'error',
        {
          allow: [],
          // `vi.mock()` + `await import()` in test files makes Nx classify the
          // whole dependency edge as lazy-loaded, which then flags every static
          // import of that lib in production source ("Static imports of
          // lazy-loaded libraries are forbidden"). The repo does no intentional
          // code-splitting this check would protect, so waive the static/dynamic
          // consistency check for all imports (`.*` is a regex matching any
          // import). Tag depConstraints + dependency-checks remain fully enforced.
          checkDynamicDependenciesExceptions: ['.*'],
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
      openthrottle: {
        rules: {
          'component-primitive-shape': componentPrimitiveShape,
          'route-primitive-shape': routePrimitiveShape,
        },
      },
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      'simple-import-sort': pluginImportSort,
      'sort-keys-fix': pluginSortKeys,
      'typescript-sort-keys': pluginTypescriptSortKeys,
    },

    rules: {
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
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
      // Enforce the "no new TypeScript enums — use `as const` objects" rule
      // from CLAUDE.md at the config layer.
      'no-restricted-syntax': [
        'error',
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
      'react/no-multi-comp': ['error', { ignoreStateless: false }],
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

  /**
   * React Router route modules legitimately co-locate a route component with
   * framework-convention exports (`Layout`, `App`, `ErrorBoundary`,
   * `HydrateFallback`), so `react/no-multi-comp` does not apply to `root.tsx`.
   */
  {
    files: ['**/root.tsx'],
    rules: {
      'react/no-multi-comp': 'off',
    },
  },

  /**
   * The component primitive shape (docs/monorepo/component-primitive-shape.md).
   * Scoped to authored component files; vendored shadcn primitives, generated
   * output (globally ignored above), tests, server modules, and stories are
   * excluded. Enforced repo-wide at `error` now that every in-scope area is at
   * spec — regressions block the build. (react-router-shadcn is handled by its
   * own follow-up variant standard and stays excluded here.)
   */
  {
    files: ['**/components/**/*.tsx'],
    ignores: [
      '**/*.example.tsx',
      '**/*.server.tsx',
      '**/*.stories.tsx',
      '**/*.test.tsx',
      '**/__tests__/**',
      '**/packages/react-router-shadcn/**',
    ],
    rules: {
      // R6 — component file-size cap (start at 210; tune after the baseline).
      'max-lines': [
        'error',
        { max: 210, skipBlankLines: false, skipComments: false },
      ],
      'openthrottle/component-primitive-shape': 'error',
    },
  },

  /**
   * The route primitive shape (docs/monorepo/route-primitive-shape.md).
   * Scoped to React Router route modules under `app/routes/`. Enabled
   * **warn-first** repo-wide during rollout — the baseline inventory found 39
   * route files with R1/R3 violations, so `error` would break every app's lint
   * at once (out of scope to remediate in one PR). Warnings surface every
   * violation in `nx lint` + the editor without failing the build; each app
   * ratchets to `error` in its own `eslint.config.ts` once its routes are
   * clean (the same per-project ratchet the component shape uses). ESLint owns
   * R1 (allowed exports), R2 (markers), R3 (module-scope hoist); R4 is the
   * `max-lines` cap. Use the first-line `route-shape: opt-out` block-comment
   * pragma for the genuinely-irreducible route (R5).
   */
  {
    files: ['**/app/routes/**/*.{ts,tsx}'],
    ignores: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/__tests__/**',
      '**/root.tsx',
    ],
    rules: {
      'max-lines': [
        'warn',
        { max: 210, skipBlankLines: false, skipComments: false },
      ],
      'openthrottle/route-primitive-shape': 'warn',
    },
  },

  /**
   * The shadcn primitive variant — root-cwd coverage
   * (docs/monorepo/component-shape-shadcn-variant.md). `nx lint` runs each
   * project with cwd at the package, where a `packages/react-router-shadcn/**`
   * glob can't match the package-relative paths, so the package's own
   * eslint.config.ts owns that path. But lint-staged and any root-level eslint
   * run from the repo root, where this glob DOES match — so mirror the package's
   * carve-outs here: shadcn primitives are multi-export / forwardRef families,
   * so `react/no-multi-comp` and the `max-lines` cap don't apply, and the base
   * authored `component-primitive-shape` gives way to the `primitive` profile
   * (enforced at `error` now that the package is at spec — plan task 5).
   */
  {
    files: ['**/packages/react-router-shadcn/**/*.tsx'],
    ignores: ['**/*-test-utils.tsx', '**/*.test.tsx', '**/__tests__/**'],
    rules: {
      'max-lines': 'off',
      'openthrottle/component-primitive-shape': [
        'error',
        { profile: 'primitive' },
      ],
      'react/no-multi-comp': 'off',
    },
  },

  /**
   * GraphQL operation documents — alphabetize selection-set fields.
   *
   * `@graphql-eslint/alphabetize` (fixable via `eslint --fix`) recursively
   * sorts fields in operations and fragments, matching the monorepo's
   * "alphabetize when order doesn't matter" convention for TS object keys.
   * The `selections` option is purely syntactic, so no GraphQL schema wiring
   * is required. Scoped to authored `.graphql` documents only — the generated
   * `schema.gql` (a `.gql`, and in `.prettierignore`), NestJS
   * `@ObjectType`/`@InputType` decorator order, and codegen output under
   * `__generated__` are all out of scope (`ignores` here plus the global
   * `__generated__` ignore above). Runs per-project under the existing
   * `nx run <project>:lint` (which invokes `eslint .`).
   */
  {
    files: ['**/*.graphql'],
    ignores: ['**/__generated__/**'],
    languageOptions: {
      parser: graphqlParser,
    },
    plugins: {
      '@graphql-eslint': graphqlEslint,
    },
    /**
     * Many routes co-locate an empty placeholder `.graphql` (the `.tsx.graphql`
     * convention) that holds no operations yet. The graphql-eslint parser
     * throws on an empty document, so skip whitespace-only files by yielding no
     * lintable block; non-empty documents pass through unchanged. `--fix` still
     * works via `supportsAutofix`.
     */
    processor: skipEmptyGraphqlProcessor,
    rules: {
      '@graphql-eslint/alphabetize': [
        'error',
        {
          selections: ['OperationDefinition', 'FragmentDefinition'],
        },
      ],
    },
  },
]);
