import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, '.env'),
});

const url = process.env.API_URL_INTERNAL;

if (!url) {
  throw new Error('🚨 API_URL_INTERNAL is required');
}

/**
 * @external https://apollographql-jp.com/devtools/editor-plugins
 * @external https://marketplace.visualstudio.com/items?itemName=apollographql.vscode-apollo
 */
export default {
  client: {
    includes: ['app/**/*.{graphql,ts,tsx}'],
    service: {
      name: '<%= name %> | Apollo GraphQL Codegen',
      url: `${url}/graphql`,
    },
    tagName: 'gql',
  },
};
