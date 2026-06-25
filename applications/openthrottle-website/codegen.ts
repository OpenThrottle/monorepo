import {
  defineCodegen,
  type CodegenConfig,
} from '@openthrottle/graphql-codegen';

const config: CodegenConfig = defineCodegen({
  dirname: __dirname,
  documents: ['app/**/*.graphql', 'app/**/*.ts', '!app/__generated__/**/*'],
  outputDir: './app/__generated__/',
  withZodSchemas: false,
});

export default config;
