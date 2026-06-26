/**
 * @description MCP developer package: tool registrations for Cortex/OpenThrottle over GraphQL.
 */

export { registerKnowledgeBaseResource } from './resources/index.js';
export { runServer, runServerLocal } from './run-server.js';

/**
 * @description Public `./auth` subpath — consumed via `@openthrottle/openthrottle-mcp/auth` and `@openthrottle/nestjs-openthrottle-mcp`.
 * @publicApi
 */
export {
  getAuthToken,
  withMcpDeveloperAuthTokenAsync,
  withMcpDeveloperAuthToken,
} from './auth/get-auth-token.js';
