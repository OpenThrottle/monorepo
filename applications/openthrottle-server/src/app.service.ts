import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';

@Injectable()
export class AppService {
  constructor(private readonly logger: LoggerService) {
    this.logger.info('🧱 App Service 🧱');
  }

  async example() {
    return 'Hello World!';
  }
}
