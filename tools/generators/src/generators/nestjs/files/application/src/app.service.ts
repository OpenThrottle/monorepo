import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';

@Injectable()
export class AppService {
  constructor(private readonly logger: LoggerService) {
    this.logger.info('🧱 App Service 🧱');
  }

  async example() {
    return 'Hello World!';
  }
}
