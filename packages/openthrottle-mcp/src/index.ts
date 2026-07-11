/**
 * @description MCP developer package: tool registrations for OpenThrottle over GraphQL.
 */

export { registerKnowledgeBaseResource } from './resources/index.ts';
export { runServer, runServerLocal } from './run-server.ts';

/**
 * @description Public `./auth` subpath — consumed via `@openthrottle/openthrottle-mcp/auth` and `@openthrottle/nestjs-openthrottle-mcp`.
 * @publicApi
 */
export {
  getAuthToken,
  withMcpDeveloperAuthTokenAsync,
  withMcpDeveloperAuthToken,
} from './auth/get-auth-token.ts';
