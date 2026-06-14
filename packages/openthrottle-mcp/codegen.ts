import dotenv from 'dotenv';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { CodegenConfig } from '@graphql-codegen/cli';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({
  path: join(__dirname, '../../applications/openthrottle-developer/.env'),
});

/** Use repo schema file so codegen/typecheck work without a running server. */
const schemaFile = resolve(__dirname, '../../schema.gql');

const url = process.env.API_URL_INTERNAL;
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment && !url) {
  throw new Error('🚨 API_URL_INTERNAL is required');
}

const config: CodegenConfig = {
  documents: [
    // Phase 1 codegen dedupe: shared plan/task/note/project/commit operations + fragments
    // are consumed from the canonical agentic-ralph set rather than duplicated here.
    // See docs/workflows/ralph-mcp-vs-graphql-consolidation-adr.md.
    '../openthrottle-agentic-ralph/src/graphql/ralph/**/*.graphql',
    // MCP-only documents (agent-conversation feature).
    'src/**/*.graphql',
    'src/**/*.ts',
    '!src/__generated__/**/*',
  ],
  generates: {
    './src/__generated__/': {
      overwrite: true,
      preset: 'client',
      presetConfig: {
        fragmentMasking: false,
      },
    },
    './src/__generated__/schemas.ts': {
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
    },
  },

  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
  // emitLegacyCommonJSImports: true,
  importExtension: '.js',
  schema: schemaFile,
  // schema: isDevelopment ? `${url}/graphql` : `../../schema.gql`,
};

export default config;
