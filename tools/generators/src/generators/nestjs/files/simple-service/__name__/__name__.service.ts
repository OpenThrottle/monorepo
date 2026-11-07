/**
 * @description Application service for <%= name %>. Inject collaborators as needed.
 */

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';

@Injectable()
export class <%= namePascal %>Service {
  private readonly name = '<%= name %>';

  constructor(private readonly logger: LoggerService) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  exampleMethod(): string {
    return '<%= name %> says Hello API';
  }
}
