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
  documents: ['src/**/*.graphql', '!src/__generated__/**/*'],
  envPath: join(__dirname, '../../applications/openthrottle-developer/.env'),
  importExtension: '.js',
  outputDir: './src/__generated__/',
});

export default config;
