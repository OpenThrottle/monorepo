import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';

/**
 * @description Placeholder service for future Nest-only MCP wiring; tools live on {@link McpDeveloperMcpSurface}.
 */
@Injectable()
export class NestjsMcpDeveloperService {
  private readonly name = 'nestjs-openthrottle-mcp';

  constructor(private readonly logger: LoggerService) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }
}
