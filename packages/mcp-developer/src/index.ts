/**
 * @description MCP developer package: tool registrations for Cortex/OpenThrottle over GraphQL.
 */

export { registerKnowledgeBaseResource } from './resources/index.js';
export { runServer, runServerLocal } from './run-server.js';

/**
 * @description Public `./auth` subpath — consumed via `@openthrottle/mcp-developer/auth` and `@openthrottle/nestjs-mcp-developer`.
 * @publicApi
 */
export {
  getAuthToken,
  withMcpDeveloperAuthTokenAsync,
  withMcpDeveloperAuthToken,
} from './auth/get-auth-token.js';
// export { NestjsMcpDeveloperModule, NestjsMcpDeveloperService } from './nest/index.js';
// export { NestjsMcpDeveloperBootstrapOptions } from './nest/nestjs-mcp-developer-bootstrap-options.interface.js';
// export { NestjsMcpDeveloperService } from './nest/nestjs-mcp-developer.service.js';
// export { NestjsMcpDeveloperModule } from './nest/nestjs-mcp-developer.module.js';
// export { NestjsMcpDeveloperBootstrapOptions } from './nest/nestjs-mcp-developer-bootstrap-options.interface.js';
// export { NestjsMcpDeveloperService } from './nest/nestjs-mcp-developer.service.js';
// export { NestjsMcpDeveloperModule } from './nest/nestjs-mcp-developer.module.js';
// export { NestjsMcpDeveloperBootstrapOptions } from './nest/nestjs-mcp-developer-bootstrap-options.interface.js';
