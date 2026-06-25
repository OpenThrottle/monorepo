import { resolve } from 'path';
import * as dotenv from 'dotenv';
import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * @description Re-export of the GraphQL Codegen config type so consuming
 * `codegen.ts` files share a single import path with {@link defineCodegen}.
 * @publicApi
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
   * resolve the repo-root `schema.gql` so codegen/typecheck work without a
   * running server.
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
   * `importExtension` forwarded to the root config (e.g. `'.js'` for
   * ESM packages that emit `.js` import specifiers).
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
   * for the `client` preset (e.g. `{ enumsAsTypes: true }`).
   */
  presetConfig?: ClientPresetConfig;
  /**
   * Emit the `typescript-validation-schema` (Zod) block at
   * `<outputDir>schemas.ts`. Defaults to `true`. Pass `false` for projects
   * that do not generate Zod schemas.
   */
  withZodSchemas?: boolean;
}

const SCHEMA_RELATIVE_PATH = '../../schema.gql';

/**
 * @description Builds a GraphQL Codegen config from the shared OpenThrottle
 * boilerplate: dotenv loading, the repo-root `schema.gql` source, the
 * `API_URL_INTERNAL` development guard, the `client` preset, the optional
 * `typescript-validation-schema` (Zod, `zod/v3`) block, and the
 * `prettier --write` write hook. Consumers express only their per-project
 * specifics (documents globs, output dir, extra preset/plugin config).
 * @publicApi
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
      overwrite: true,
      preset: 'client',
      presetConfig: {
        fragmentMasking: false,
        ...presetConfig,
      },
    },
  };

  if (withZodSchemas) {
    generates[`${outputDir}schemas.ts`] = {
      config: {
        importFrom: './graphql.js',
        scalars: {
          DateTime: Date,
        },
        schema: 'zod',
        strictScalars: true,
        zodImportPath: 'zod/v3', // FIXME: See zodImportPath ~ https://www.npmjs.com/package/graphql-codegen-typescript-validation-schema
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
    schema: schemaFile,
  };

  if (importExtension !== undefined) {
    config.importExtension = importExtension;
  }

  return config;
};
