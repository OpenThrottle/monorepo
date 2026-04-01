import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';

@Injectable()
export class NestjsGraphqlService {
  private name = 'nestjs-graphql';

  constructor(private readonly logger: LoggerService) {
    this.logger.debug(`🧠 ${this.name} 🧠`);
  }

  // TODO: Fill in the actual tool calls
  exampleMethod() {
    return `${this.name} says Hello API`;
  }
}
