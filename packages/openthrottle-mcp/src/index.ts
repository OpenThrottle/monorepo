/**
 * @description MCP developer package: tool registrations for OpenThrottle over GraphQL.
 */

export { registerKnowledgeBaseResource } from './resources/index.ts';
export { runServer, runServerLocal } from './runServer.ts';

/**
 * @description Public `./auth` subpath — consumed via `@openthrottle/openthrottle-mcp/auth` and `@openthrottle/nestjs-mcp-developer`.
 * @public
 */
export {
  getAuthToken,
  withMcpDeveloperAuthToken,
  withMcpDeveloperAuthTokenAsync,
} from './auth/getAuthToken.ts';
