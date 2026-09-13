import js from '@eslint/js';
import graphqlEslint, {
  parser as graphqlParser,
} from '@graphql-eslint/eslint-plugin';
import pluginNx from '@nx/eslint-plugin';
import type { Linter } from 'eslint';
import pluginImportX from 'eslint-plugin-import-x';
import pluginJest from 'eslint-plugin-jest';
import pluginPerfectionist from 'eslint-plugin-perfectionist';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginSimpleImportSort from 'eslint-plugin-simple-import-sort';
import tslint from 'typescript-eslint';

import { componentPrimitiveShape } from './rules/component-primitive-shape.ts';
import { preHooksUnpack } from './rules/pre-hooks-unpack.ts';
import { routePrimitiveShape } from './rules/route-primitive-shape.ts';
import { getDirname } from './vite-config.ts';

/** @public */
export type { Config as EslintFlatConfig } from 'eslint/config';
/** @public */
export { prettierConfig } from './prettier-config.ts';
/** @public */
export {
  createViteConfig,
  type CreateViteConfigOptions,
  defineViteConfig,
  getDirname,
  type PackageType,
} from './vite-config.ts';
/** @public */
export {
  createVitestConfig,
  createVitestConfigHappyDom,
  createVitestConfigJsdom,
  createVitestConfigNode,
  type CreateVitestConfigOptions,
  type TestEnvironment,
  VITEST_HOOK_TIMEOUT_MS,
  VITEST_TEST_TIMEOUT_MS,
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
/**
 * Printable ASCII in code-point order, fed to `perfectionist`'s `type: 'custom'`
 * so its collation matches the core `sort-keys` rule exactly. Perfectionist's
 * built-in `'alphabetical'` mode collates by locale instead, which disagrees
 * with `sort-keys` wherever a name differs only by case.
 */
const CODE_POINT_ALPHABET = Array.from({ length: 95 }, (_, index) =>
  String.fromCharCode(32 + index),
).join('');

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
      // `@nx/dependency-checks` deliberately does NOT live here. It only does
      // anything when applied to `**/package.json` with `jsonc-eslint-parser`,
      // so declaring it in this source-file block was inert — a rule set to
      // `error` that never once fired. Scoping it correctly was spiked and
      // rejected: with `buildTargets: ['typecheck']` it does find every
      // undeclared sibling, but it cannot be narrowed to workspace packages
      // (`ignoredDependencies` is an exact-match string list, no globs, no
      // negation), so repo-wide it reports 442 missing declarations and 59
      // obsolete ones across all 71 projects — the entire root-hoisting
      // surface, not the sibling-import drift we want gated. That gate is
      // `scripts/audit-workspace-deps.ts` instead.
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
          // import). Tag depConstraints remain fully enforced.
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
      'import-x': pluginImportX,
      jest: pluginJest,
      openthrottle: {
        rules: {
          'component-primitive-shape': componentPrimitiveShape,
          'pre-hooks-unpack': preHooksUnpack,
          'route-primitive-shape': routePrimitiveShape,
        },
      },
      perfectionist: pluginPerfectionist,
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      'simple-import-sort': pluginSimpleImportSort,
    },

    rules: {
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
      // `return-types.mdc` asks for return types on functions declared "on the
      // top-level of a module" — that is the module boundary, not every
      // function. `explicit-module-boundary-types` says exactly that;
      // `explicit-function-return-type` says something much broader, and
      // measuring both makes the difference concrete: 1,341 violations vs
      // 14,973 for the same convention, over the same tree. The narrower rule
      // is the one that matches the doc, so it is the one that is on. Under the
      // real `nx lint` targets — which ignore the generated and build output an
      // ad-hoc sweep picks up — it is **362** warnings.
      //
      // `warn`, not `error`: 362 sites cannot be fixed in one change, and the
      // lint target passes no `--max-warnings`, so this never blocks CI. The
      // consumer is the weekly `.agents/prompts/Job_RulesConformance.md` sweep,
      // which triages them — without that reader this would just be 1,341
      // messages nobody sees.
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': [
        'warn',
        {
          allowHigherOrderFunctions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
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
      // Named exports only — a default export costs the importer the shared,
      // greppable name. Framework entry points that *require* a default are
      // carved out below; everything else is an error.
      'import-x/no-default-export': 'error',
      'import-x/no-named-as-default-member': 'off',
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
      // New in the ESLint 10 `recommended` set. 13 real dead stores across the
      // repo when the upgrade landed; `warn` so the bump stays behaviour-neutral
      // at `error`, and because a "useless" assignment is occasionally a typo
      // masking a bug, which wants a human read rather than a blind delete.
      'no-useless-assignment': 'warn',
      // Interface-member and enum alphabetization, replacing
      // eslint-plugin-typescript-sort-keys. That plugin is abandoned (peer range
      // `^7 || ^8`) and crashes at rule *load* under ESLint 10 —
      // `createNodeSwapper` calls the removed `context.getSourceCode()` — so it
      // could not be carried forward.
      //
      // `type: 'custom'` with an explicit printable-ASCII alphabet, not the
      // default `'alphabetical'`. Perfectionist's alphabetical mode collates by
      // locale, where `editors` sorts before `editorWorkingDirectory` and
      // `pickedPath` before `pickError`. Core `sort-keys` (still on, below)
      // compares by code point, where the capital sorts first in both. Measured:
      // the locale default disagreed with the repo's existing order on 32
      // interfaces. Two collations in one repo is worse than either, so this
      // matches `sort-keys` rather than the other way round.
      //
      // `perfectionist/sort-objects` is deliberately NOT enabled. Core
      // `sort-keys` already covers object literals with identical detection
      // (sort-keys-fix was a fork of it that only added a fixer), and
      // perfectionist's version additionally sorts destructuring patterns —
      // 369 new errors, and a reordering hazard where a default value
      // references an earlier binding. The cost of dropping sort-keys-fix is
      // therefore the autofix alone, not the enforcement.
      'perfectionist/sort-enums': [
        'error',
        {
          alphabet: CODE_POINT_ALPHABET,
          ignoreCase: false,
          order: 'asc',
          type: 'custom',
        },
      ],
      'perfectionist/sort-interfaces': [
        'error',
        {
          alphabet: CODE_POINT_ALPHABET,
          // Index signatures sort ahead of named members rather than being
          // collated with them by their rendered text (`readonly [key: string]`,
          // which would sort under `r`). `typescript-sort-keys` skipped index
          // signatures entirely, so this keeps the one interface in the repo
          // that mixes the two — ConversationStreamSubscriptionVariables — legal.
          groups: ['index-signature', 'unknown'],
          ignoreCase: false,
          order: 'asc',
          type: 'custom',
        },
      ],
      // Also new in the ESLint 10 `recommended` set: 9 sites rethrow inside a
      // `catch` without attaching `{ cause }`, losing the original error. Real
      // findings and worth fixing, but they are edits to error-handling paths,
      // not part of a toolchain bump — `warn` until they are done deliberately.
      'preserve-caught-error': 'warn',
      'react/jsx-boolean-value': ['error', 'always'],
      'react/jsx-curly-brace-presence': ['error', 'never'],
      'react/jsx-sort-props': 'error',
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/no-multi-comp': ['error', { ignoreStateless: false }],
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
      'sort-keys': [
        'error',
        'asc',
        { caseSensitive: true, minKeys: 2, natural: false },
      ],
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
   * `import type` for type-only imports, and the naming conventions — both
   * enforced here rather than in the shared base block for the same reason.
   *
   * Scoped to `.ts`/`.tsx` deliberately: the rule needs parser services, and
   * the `@graphql-eslint/parser` virtual documents (`*.tsx.graphql`) do not
   * provide them — putting the rule in the shared base block crashes a
   * full-repo lint run with "You have used a rule which requires type
   * information".
   *
   * `emitDecoratorMetadata` is declared here rather than read from
   * `tsconfig.base.json`, which sets it to `false`. That is a lie for the
   * decorated surface: `applications/openthrottle-server/.swcrc` compiles with
   * `decoratorMetadata: true`, so NestJS constructor injection *does* rely on
   * `design:paramtypes` at runtime. Without this flag the rule would happily
   * rewrite an injected class import to `import type`, SWC would emit no
   * runtime binding, and DI would fail at boot — with lint, typecheck and build
   * all green. Telling the rule the truth makes it skip imports used in
   * decorated constructor parameters.
   */
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
      },
    },
    rules: {
      // `disallowTypeAnnotations` (on by default) also bans inline `import()`
      // types. That is a different convention from `import-type.mdc`, which is
      // about import *statements*, and the 97 sites it flags are all load
      // bearing: `vi.importActual<typeof import('../x')>()` is Vitest's own
      // documented idiom (and a top-level import of the module you are mocking
      // is exactly what those files avoid), and `typeof import('monaco-editor')`
      // exists so the editor bundle stays lazily loaded.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { disallowTypeAnnotations: false },
      ],
      // `naming-conventions.mdc`, translated selector by selector. Only the
      // clauses the rule can actually express are here — the doc's file-name
      // clause (kebab-case, PascalCase for components) is not something
      // `naming-convention` can see, so it stays honor-system.
      //
      // Measured 2026-09-05, after excluding build output: 31 violations, all
      // fixed in the same change, so this is `error` rather than the `warn` the
      // plan assumed. The plan's 30,220 came from the plugin's defaults over a
      // tree that still included `storybook-static/` — minified bundles account
      // for the bulk of it. `leadingUnderscore: 'allowSingleOrDouble'` is what
      // keeps `__dirname`/`__filename` and the `^_` unused-var convention legal.
      '@typescript-eslint/naming-convention': [
        'error',
        { format: ['PascalCase'], selector: 'typeLike' },
        { format: ['PascalCase'], prefix: ['T'], selector: 'typeParameter' },
        { format: ['UPPER_CASE'], selector: 'enumMember' },
        {
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allowSingleOrDouble',
          selector: 'function',
        },
        {
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allowSingleOrDouble',
          selector: 'variable',
        },
      ],
    },
  },

  /**
   * Default-export carve-outs. Every one of these is a file whose *consumer*
   * reads the default export, so a named export would simply not work:
   *
   * - tooling configs (Vite, Vitest, ESLint, Tailwind, PostCSS, graphql-codegen)
   * - React Router framework files: `app/routes.ts`, `app/root.tsx`,
   *   `app/entry.*.tsx`, and every route module under `app/routes/`
   * - Storybook: `.storybook/*` and CSF story files (the `meta` default export)
   * - Nx generators, resolved by `generators.json` `factory` via the default export
   *
   * Measured 2026-09-05: 405 default exports repo-wide, all of them in these
   * buckets. There is no residue of hand-written default exports to convert.
   */
  {
    files: [
      '**/*.config.{cjs,cts,js,mjs,mts,ts}',
      '**/.storybook/**/*.{ts,tsx}',
      '**/*.stories.{ts,tsx}',
      '**/app/entry.*.{ts,tsx}',
      '**/app/root.tsx',
      '**/app/routes.ts',
      '**/app/routes/**/*.{ts,tsx}',
      '**/codegen.ts',
      '**/src/generators/*/generator.ts',
    ],
    rules: {
      'import-x/no-default-export': 'off',
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
      // The pre-Hooks props-unpack contract (component R3, "The pre-Hooks unpack
      // block"). Shipped warn-first on both surfaces — a shared rule, not a
      // second checker — so an after-Hooks / after-Short-Circuit unpack is
      // visible without breaking the build. Graduates to `error` later,
      // independently per surface.
      'openthrottle/pre-hooks-unpack': 'warn',
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
      // Same pre-Hooks unpack contract as the component surface — route keys
      // (loaderData/actionData/params/matches) are just a props shape, so the
      // shared rule covers the default Component here too (warn-first).
      'openthrottle/pre-hooks-unpack': 'warn',
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

/**
 * The one strip-only restriction the TypeScript compiler will not enforce for
 * us, for the packages that need it.
 *
 * A **source-first** package — one whose `exports` name `./src/` — hands raw
 * TypeScript to its consumers, and when the consumer is Node, its strip-only
 * type loader *erases* types but never *emits* code. Every construct whose
 * semantics require generated output is rejected outright, in an unrelated
 * project's test run, with an error naming neither the package nor `exports`.
 * See docs/monorepo/source-first-packages-and-strip-only.md.
 *
 * `erasableSyntaxOnly` in `tsconfig.base.json` covers that class repo-wide —
 * parameter properties, `enum`, `namespace`, `import x = require()` — at
 * `typecheck`, in the editor, with no custom code. It deliberately does **not**
 * flag decorators, which are equally unemittable but which the NestJS surface
 * is built out of. So decorators are the residue, and they are banned here
 * rather than globally, scoped by each package that opts into source-first.
 *
 * Spread this **after** `eslintConfig` in a source-first package's
 * `eslint.config.ts`. `no-restricted-syntax` options replace rather than merge,
 * so the enum entry from the base block is repeated; `__tests__` is left alone
 * so the snapshot restrictions there survive.
 * @public
 */
export const sourceFirstEslintConfig = tslint.config([
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/__tests__/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          message: `Avoid TypeScript enums. Use an \`as const\` object instead (existing enums are grandfathered).`,
          selector: 'TSEnumDeclaration',
        },
        {
          message: `This package is source-first — its "exports" name ./src/, so consumers get raw TypeScript. A decorator implies a generated call wrapping the declaration, which Node's strip-only loader cannot emit: a consumer resolving this package through Node fails with "SyntaxError: Invalid or unexpected token", naming neither this package nor the "exports" decision. Either drop the decorator, or stop pointing this package's require/default conditions at ./src/. See docs/monorepo/source-first-packages-and-strip-only.md.`,
          selector: 'Decorator',
        },
      ],
    },
  },
]);
