import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NestjsRedisService {
  private name = 'nestjs-redis';

  constructor(readonly logger: LoggerService) {
    this.logger.info(`💾 ${this.name} 💾`);
  }

  // TODO: Fill in the actual tool calls
  exampleMethod() {
    return `${this.name} says Hello API`;
  }
}
