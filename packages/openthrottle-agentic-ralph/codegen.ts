import {
  type CodegenConfig,
  defineCodegen,
} from '@openthrottle/graphql-codegen';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: CodegenConfig = defineCodegen({
  dirname: __dirname,
  documents: ['src/graphql/ralph/**/*.graphql', '!src/__generated__/**/*'],
  envPath: join(__dirname, '../../applications/openthrottle-developer/.env'),
  importExtension: '.js',
  outputDir: './src/__generated__/',
});

export default config;
