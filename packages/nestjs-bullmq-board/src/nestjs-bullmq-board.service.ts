import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NestjsBullmqBoardService {
  private name = 'nestjs-bullmq-board';

  constructor(private readonly logger: LoggerService) {
    this.logger.debug(`🎯 ${this.name} 🎯`);
  }

  // TODO: Fill in the actual tool calls
  exampleMethod() {
    return `${this.name} says Hello API`;
  }
}
