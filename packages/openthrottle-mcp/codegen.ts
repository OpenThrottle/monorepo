import type { CodegenConfig } from '@openthrottle/graphql-codegen';
import { defineCodegen } from '@openthrottle/graphql-codegen';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: CodegenConfig = defineCodegen({
  dirname: __dirname,
  documents: [
    // Every .graphql document this package owns, including src/graphql/operations/: the shared
    // plan/task/note/project/commit operations and fragments that openthrottle-server's
    // codegen also reads.
    'src/**/*.graphql',
    'src/**/*.ts',
    '!src/__generated__/**/*',
  ],
  envPath: join(__dirname, '../../applications/openthrottle-developer/.env'),
  importExtension: '.js',
  outputDir: './src/__generated__/',
});

export default config;
