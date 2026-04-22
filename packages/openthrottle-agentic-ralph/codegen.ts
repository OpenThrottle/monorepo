import * as dotenv from 'dotenv';
import { CodegenConfig } from '@graphql-codegen/cli';

dotenv.config();

const url = process.env.API_URL_INTERNAL;
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment && !url) {
  throw new Error('🚨 API_URL_INTERNAL is required');
}

const config: CodegenConfig = {
  documents: ['src/graphql/ralph/**/*.graphql', '!src/__generated__/**/*'],
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
  schema: `../../schema.gql`,
  // schema: isDevelopment ? `${url}/graphql` : `../../schema.gql`,

  // schema: {
  //   [supabaseURL]: {
  //     headers: {
  //       Authorization: `Bearer ${supabaseJWT}`,
  //       apikey: supabaseJWT,
  //     },
  //   },
  // },
};

export default config;
