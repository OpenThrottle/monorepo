import type { CodegenConfig } from '@graphql-codegen/cli';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

/**
 * @description Re-export of the GraphQL Codegen config type so consuming
 * `codegen.ts` files share a single import path with {@link defineCodegen}.
 * @public
 */
export type { CodegenConfig } from '@graphql-codegen/cli';

/** Options for the `client`-preset output block (`./<dir>/__generated__/`). */
type ClientPresetConfig = NonNullable<
  CodegenConfig['generates'][string] extends infer G
    ? G extends { presetConfig?: infer P }
      ? P
      : Record<string, unknown>
    : Record<string, unknown>
>;

/** Options accepted by {@link defineCodegen}. */
export interface DefineCodegenOptions {
  /**
   * Absolute path to the `__dirname` of the consuming `codegen.ts`. Used to
   * resolve the committed `applications/openthrottle-server/schema.gql` so
   * codegen/typecheck work without a running server.
   */
  dirname: string;
  /**
   * Glob patterns for the GraphQL documents this project consumes.
   * Passed through verbatim to the underlying `client` preset.
   */
  documents: CodegenConfig['documents'];
  /**
   * Optional path to a `.env` file to load. When omitted, the default
   * `dotenv.config()` (project cwd) is used.
   */
  envPath?: string;
  /**
   * `importExtension` forwarded to the root config, and to the Zod schemas'
   * `importFrom`. Pick it from how the package is *consumed*, not just from its
   * module type:
   *
   * - `'.js'` for an ESM package that is **built** — NodeNext source must name
   *   the emitted `.js` (e.g. `@openthrottle/openthrottle-mcp`).
   * - `'.ts'` for an ESM package that is **source-first** — consumers read the
   *   TypeScript directly, so a `.js` specifier names a file that does not
   *   exist. The failure only appears once something resolves the package from
   *   built code, which is why it can sit latent for a long time.
   * - unset for the React Router apps, whose Vite resolves either.
   */
  importExtension?: CodegenConfig['importExtension'];
  /**
   * Output base directory for the generated client artifacts, relative to the
   * project root. Defaults to `'./app/__generated__/'` (React Router apps);
   * pass `'./src/__generated__/'` for `src`-based packages.
   */
  outputDir?: string;
  /**
   * Extra `presetConfig` keys merged onto the shared `{ fragmentMasking: false }`
   * for the `client` preset (e.g. `{ persistedDocuments: true }`).
   *
   * Not the place for enum handling: `enumType: 'const'` is set in the shared
   * `config` block, and the client preset reads no enum option from
   * `presetConfig` (an `enumsAsTypes` key here is a silent no-op).
   */
  presetConfig?: ClientPresetConfig;
  /**
   * Emit the `typescript-validation-schema` (Zod) block at
   * `<outputDir>schemas.ts`, plus the `<outputDir>schema-types.ts` it imports
   * every input type and enum from. Defaults to `true`. Pass `false` for projects
   * that do not generate Zod schemas.
   */
  withZodSchemas?: boolean;
}

const SCHEMA_RELATIVE_PATH = `../../applications/openthrottle-server/schema.gql`;

/** TypeScript types for the scalars, shared by the client and schema-types blocks. */
const SCALARS = {
  DateTime: 'string',
  ID: 'string',
} as const;

/**
 * @description Builds a GraphQL Codegen config from the shared OpenThrottle
 * boilerplate: dotenv loading, the committed `openthrottle-server/schema.gql` source, the
 * `API_URL_INTERNAL` development guard, the `client` preset, the optional
 * `typescript-validation-schema` (Zod, `zod/v3`) block, and the
 * `prettier --write` write hook. Consumers express only their per-project
 * specifics (documents globs, output dir, extra preset/plugin config).
 * @public
 */
export const defineCodegen = (options: DefineCodegenOptions): CodegenConfig => {
  const {
    dirname,
    documents,
    envPath,
    importExtension,
    outputDir = './app/__generated__/',
    presetConfig,
    withZodSchemas = true,
  } = options;

  if (envPath) {
    dotenv.config({ path: envPath });
  } else {
    dotenv.config();
  }

  /** Use repo schema file so codegen/typecheck work without a running server. */
  const schemaFile = resolve(dirname, SCHEMA_RELATIVE_PATH);

  const url = process.env.API_URL_INTERNAL;
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment && !url) {
    throw new Error('🚨 API_URL_INTERNAL is required');
  }

  const generates: CodegenConfig['generates'] = {
    [outputDir]: {
      config: {
        // Generated code was the one place the repo's no-enums rule could not
        // reach: AGENTS.md bans `enum` and ESLint enforces it, but neither can
        // touch a file codegen overwrites. The cost was real — `export enum` is
        // non-erasable syntax, so every project whose program included a
        // generated `graphql.ts` needed an `erasableSyntaxOnly: false` opt-out,
        // six of them, including one package that merely *consumes* a
        // source-first package carrying generated enums. `enumType: 'const'`
        // emits an `as const` object plus a matching type alias, which keeps
        // both value and type positions working. client-preset 7 forwards
        // `enumType` and silently drops the older `enumsAsConst`, whose absence
        // falls back to type-only string unions — so every runtime enum read
        // (`PlanTaskStatus.Completed`) would vanish. In `presetConfig` the
        // client preset ignores both. See
        // docs/monorepo/source-first-packages-and-strip-only.md.
        enumType: 'const',
        // client-preset 6 changed the scalar defaults: custom scalars became
        // `unknown` (were `any`) and `ID` inputs became `string | number`. Both
        // travel as JSON strings, so pin them to `string` — the type every
        // consumer already reads them as.
        scalars: SCALARS,
        // `@graphql-typed-document-node/core` is a TYPES-ONLY package: its
        // package.json has `"main": ""` and it ships nothing but
        // `typings/index.d.ts`. Emitted as a plain value import, the statement
        // survives Node's strip-only loader — which erases type annotations but
        // never removes an import that looks like a value — and resolution then
        // fails with `Cannot find package`, naming the package rather than the
        // generated file that imported it. Declaring the dependency does not
        // help; there is no runtime entry to resolve. `import type` erases at
        // the source level, so the statement is gone before any loader sees it.
        // Bundler consumers were unaffected, which is why this sat latent until
        // a source-first ESM package was first reached from built code.
        useTypeImports: true,
      },
      overwrite: true,
      preset: 'client',
      presetConfig: {
        fragmentMasking: false,
        ...presetConfig,
      },
    },
  };

  if (withZodSchemas) {
    // client-preset 6+ emits only the input types and enums that some
    // operation actually uses, but the Zod plugin imports EVERY input type and
    // enum in the schema. This block emits that full set (no object types) for
    // the Zod schemas to import from. A consumer that needs an input type or
    // enum no operation uses imports it from here too.
    generates[`${outputDir}schema-types.ts`] = {
      config: {
        // The standalone `typescript` plugin still spells it `enumsAsConst`
        // (only the client preset moved to `enumType`).
        enumsAsConst: true,
        onlyOperationTypes: true,
        // The Zod plugin emits a `definedNonNullAny` schema for `DateTime`,
        // whose output type (`{}`) is not assignable to `string`, so the
        // schema's input types type it `unknown`. Before client-preset 6 the
        // shared type was `any`, which hid the mismatch.
        scalars: { ...SCALARS, DateTime: 'unknown' },
        useTypeImports: true,
      },
      overwrite: true,
      plugins: ['typescript'],
    };
    generates[`${outputDir}schemas.ts`] = {
      config: {
        // Must follow `importExtension`: a source-first ESM package is consumed
        // as TypeScript, so a `.js` specifier here names a file that does not
        // exist. Defaults to `.js` so configs that leave `importExtension` unset
        // (the React Router apps, whose Vite resolves it) are unaffected.
        importFrom: `./schema-types${importExtension ?? '.js'}`,
        // Required (non-null) GraphQL string inputs reject `''` (emitted as
        // `.min(1)`). Only applies to non-null strings — nullable/optional
        // fields stay lenient — so route actions and MCP tools no longer need
        // hand-rolled empty-string guards. See the FormData → schema util in
        // `@openthrottle/react-router-graphql`.
        notAllowEmptyString: true,
        scalars: {
          DateTime: Date,
        },
        schema: 'zod',
        strictScalars: true,
        // Kept on the `zod/v3` compat subpath (catalog ships zod v4). Migrating
        // the generated schemas to the native v4 API is a separate,
        // cross-consumer (developer/admin/email/mcp/ralph) compatibility effort
        // — not a silent flip. See https://www.npmjs.com/package/graphql-codegen-typescript-validation-schema
        zodImportPath: 'zod/v3',
      },
      overwrite: true,
      plugins: ['typescript-validation-schema'],
    };
  }

  const config: CodegenConfig = {
    documents,
    generates,
    hooks: {
      afterAllFileWrite: ['prettier --write'],
    },
    // A freshly generated app has no `.graphql` documents yet, and an empty
    // documents glob is a hard failure by default — so every new app failed
    // `codegen-graphql` in CI until someone wrote its first query. With no
    // documents the client preset still emits the schema types.
    ignoreNoDocuments: true,
    schema: schemaFile,
  };

  if (importExtension !== undefined) {
    config.importExtension = importExtension;
  }

  return config;
};
