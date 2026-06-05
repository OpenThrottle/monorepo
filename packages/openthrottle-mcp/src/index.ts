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
// export { NestjsMcpDeveloperModule, NestjsMcpDeveloperService } from './nest/index.js';
// export { NestjsMcpDeveloperBootstrapOptions } from './nest/nestjs-openthrottle-mcp-bootstrap-options.interface.js';
// export { NestjsMcpDeveloperService } from './nest/nestjs-openthrottle-mcp.service.js';
// export { NestjsMcpDeveloperModule } from './nest/nestjs-openthrottle-mcp.module.js';
// export { NestjsMcpDeveloperBootstrapOptions } from './nest/nestjs-openthrottle-mcp-bootstrap-options.interface.js';
// export { NestjsMcpDeveloperService } from './nest/nestjs-openthrottle-mcp.service.js';
// export { NestjsMcpDeveloperModule } from './nest/nestjs-openthrottle-mcp.module.js';
// export { NestjsMcpDeveloperBootstrapOptions } from './nest/nestjs-openthrottle-mcp-bootstrap-options.interface.js';
