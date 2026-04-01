import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NestjsThrottlerService {
  private name = 'nestjs-throttler';

  constructor(readonly logger: LoggerService) {
    logger.info(`📧 💻 ${this.name} 💻 📧`);
  }

  // TODO: Fill in the actual tool calls
  exampleMethod() {
    return `${this.name} says Hello API`;
  }
}
