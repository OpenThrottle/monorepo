import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  defineCodegen,
  type CodegenConfig,
} from '@openthrottle/graphql-codegen';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: CodegenConfig = defineCodegen({
  dirname: __dirname,
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
  envPath: join(__dirname, '../../applications/openthrottle-developer/.env'),
  importExtension: '.js',
  outputDir: './src/__generated__/',
});

export default config;
