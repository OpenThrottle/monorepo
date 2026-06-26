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
 * 2. A `.ts`-free document scope. The app codegen ALSO scans `app/**\/*.ts` to
 *    catch any inline `graphql(...)` calls; this package scans only `*.graphql`
 *    files, giving it a stable, transpile-independent document set that consuming
 *    packages can import. This is safe — and complete — because the developer app
 *    keeps every operation in a sidecar `<route>.tsx.graphql` file (today there
 *    are zero inline `graphql(...)` calls in `app/**\/*.ts`/`.tsx`), so the
 *    `.graphql`-only glob already sees the full document set. Do NOT add
 *    `*.ts`/`*.tsx` here: it would re-scan the app's own generated output and
 *    duplicate the app's pass for no new operations.
 *
 * The document glob is anchored to `__dirname` via `join(...)` (mirroring
 * `envPath` below) rather than a bare `'../../...'` relative string, so it stays
 * correct regardless of the codegen process cwd and is less brittle if either
 * project moves. The `!` ignore glob stays package-relative — it targets THIS
 * package's `src/__generated__/` output, not the app.
 *
 * Keep this comment and `withZodSchemas: false` in sync with the cross-reference
 * note in `applications/openthrottle-developer/codegen.ts`.
 */
const config: CodegenConfig = defineCodegen({
  dirname: __dirname,
  documents: [
    join(
      __dirname,
      '../../applications/openthrottle-developer/app/**/*.graphql',
    ),
    // join(__dirname, '../../packages/*/src/**/*.graphql'),
    // 'src/graphql/ralph/**/*.graphql',
    '!src/__generated__/**/*',
  ],
  envPath: join(__dirname, '../../applications/openthrottle-developer/.env'),
  importExtension: '.js',
  outputDir: './src/__generated__/',
  withZodSchemas: false,
});

export default config;
