import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
// import { Get<%= namePascal %>Args } from '~/services/<%= name %>/dto/get-<%= name %>.args';

@Injectable()
export class <%= namePascal %>Service {
  private name = '<%= name %>';

  // Inject and initialize as needed
  constructor(private readonly logger: LoggerService) {
    this.logger.debug(`🧩 ${this.name} 🧩`);

    // TODO: If we need to do anything in here
  }

  exampleMethod() {
    return '<%= name %> says Hello API';
  }
}
