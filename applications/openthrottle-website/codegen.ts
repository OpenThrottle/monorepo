import * as dotenv from 'dotenv';
import { CodegenConfig } from '@graphql-codegen/cli';

dotenv.config();

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
