import type { CodegenConfig } from '@openthrottle/graphql-codegen';
import { defineCodegen } from '@openthrottle/graphql-codegen';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: CodegenConfig = defineCodegen({
  dirname: __dirname,
  // The plan-run documents the OT Loop job executes (queues/ot-loop/). openthrottle-mcp owns them,
  // because a package cannot read documents from an application; the server reads them from there.
  documents: [
    '../../packages/openthrottle-mcp/src/graphql/fragments.graphql',
    '../../packages/openthrottle-mcp/src/graphql/mutations.graphql',
    '../../packages/openthrottle-mcp/src/graphql/plan-messages.graphql',
    '../../packages/openthrottle-mcp/src/graphql/queries.graphql',
    '../../packages/openthrottle-mcp/src/graphql/work-sessions.graphql',
    '!src/__generated__/**/*',
  ],
  importExtension: '.ts',
  outputDir: './src/__generated__/',
  withZodSchemas: false,
});

export default config;
