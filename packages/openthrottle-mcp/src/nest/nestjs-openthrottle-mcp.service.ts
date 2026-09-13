import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';

/**
 * @description Placeholder service for future Nest-only MCP wiring; tools live on {@link McpDeveloperMcpSurface}.
 */
@Injectable()
export class NestjsMcpDeveloperService {
  private readonly logger: LoggerService;
  private readonly name = 'nestjs-openthrottle-mcp';

  // Assigned in the body rather than declared as a constructor parameter
  // property: the latter is non-erasable syntax, and this package typechecks
  // under the repo-wide `erasableSyntaxOnly`. Nest still resolves the
  // dependency — `design:paramtypes` comes from the constructor signature,
  // which is unchanged.
  constructor(logger: LoggerService) {
    this.logger = logger;
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }
}
