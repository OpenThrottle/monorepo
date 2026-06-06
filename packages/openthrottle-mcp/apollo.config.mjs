import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({
  path: join(__dirname, '../../applications/openthrottle-developer/.env'),
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
    includes: ['src/**/*.{graphql,ts,tsx}'],
    service: {
      name: 'openthrottle-mcp | Apollo GraphQL Codegen',
      url: `${url}/graphql`,
    },
    tagName: 'gql',
  },
};
