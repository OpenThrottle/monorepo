import { resolve } from 'path';
import * as dotenv from 'dotenv';
import { CodegenConfig } from '@graphql-codegen/cli';

dotenv.config();

/** Use repo schema file so codegen/typecheck work without a running server. */
const schemaFile = resolve(__dirname, '../../schema.gql');

const url = process.env.API_URL_INTERNAL;
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment && !url) {
  throw new Error('🚨 API_URL_INTERNAL is required');
}

const config: CodegenConfig = {
  documents: ['app/**/*.graphql', 'app/**/*.ts', '!app/__generated__/**/*'],
  generates: {
    './app/__generated__/': {
      overwrite: true,
      preset: 'client',
      presetConfig: {
        fragmentMasking: false,
        // scalars: {
        //   BigFloat: GraphQLBigInt,
        //   BigInt: Number,
        //   Numeric: Number,
        // },
      },
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
  schema: schemaFile,
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
