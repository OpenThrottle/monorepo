/**
 * @description MCP developer package: tool registrations for OpenThrottle over GraphQL.
 */

export { registerKnowledgeBaseResource } from './resources/index.ts';
export { runServer, runServerLocal } from './runServer.ts';

/**
 * @description Per-request auth token helpers — consumed by `@openthrottle/nestjs-mcp-developer` and openthrottle-server.
 * @public
 */
export {
  getAuthToken,
  withMcpDeveloperAuthToken,
  withMcpDeveloperAuthTokenAsync,
} from './utils/getAuthToken.ts';
