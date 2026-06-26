import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  defineCodegen,
  type CodegenConfig,
} from '@openthrottle/graphql-codegen';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * INTENTIONAL DIVERGENCE FROM `applications/openthrottle-developer/codegen.ts`.
 *
 * This package runs a *second* codegen pass over the developer app's GraphQL
 * documents and emits into `src/__generated__/`. It deliberately differs from
 * the app's own codegen in two load-bearing ways — do NOT "align the configs":
 *
 * 1. NO `enumsAsTypes`. The app config passes `presetConfig.enumsAsTypes: true`,
 *    so the app's `app/__generated__` enums are type-only unions with no runtime
 *    value. This package omits `enumsAsTypes`, so its enums are emitted as real
 *    runtime `enum` objects. `PromptsTable.tsx` imports `CustomPromptType` from
 *    this package specifically to get the runtime object (`CustomPromptType.Agents`),
 *    which the app's own codegen cannot provide. Adding `enumsAsTypes` here, or
 *    "consolidating" the two configs, silently breaks `PromptsTable` at runtime.
 *
 * 2. A `.ts`-free document scope. The app codegen scans `app/**\/*.ts` for inline
 *    `graphql(...)` calls; this package scans only `*.graphql` files, giving it a
 *    stable, transpile-independent document set that consuming packages can import.
 *
 * Keep this comment and `withZodSchemas: false` in sync with the cross-reference
 * note in `applications/openthrottle-developer/codegen.ts`.
 */
const config: CodegenConfig = defineCodegen({
  dirname: __dirname,
  documents: [
    '../../applications/openthrottle-developer/app/**/*.graphql',
    // '../../packages/*/src/**/*.graphql',
    // 'src/graphql/ralph/**/*.graphql',
    '!src/__generated__/**/*',
  ],
  envPath: join(__dirname, '../../applications/openthrottle-developer/.env'),
  importExtension: '.js',
  outputDir: './src/__generated__/',
  withZodSchemas: false,
});

export default config;
