import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NestjsAuthService {
  private name = 'nestjs-auth';

  // Inject and initialize as needed
  constructor(private readonly logger: LoggerService) {
    this.logger.debug(`🧩 ${this.name} 🧩`);

    // TODO: If we need to do anything in here
  }

  // TODO: Fill in the actual tool calls
  exampleMethod() {
    return `${this.name} says Hello API`;
  }
}
