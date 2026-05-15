import { LoggerService } from '@openthrottle/nestjs-modules';
import { Injectable } from '@nestjs/common';

/**
 * @description Placeholder service for future Nest-only MCP wiring; tools live on {@link McpDeveloperMcpSurface}.
 */
@Injectable()
export class NestjsMcpDeveloperService {
  private readonly name = 'nestjs-mcp-developer';

  constructor(private readonly logger: LoggerService) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }
}
