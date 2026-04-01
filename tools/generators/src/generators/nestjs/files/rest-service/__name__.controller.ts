import { Controller, Get } from '@nestjs/common';
import { <%= namePascal %>Service } from './<%= name %>.service';

@Controller()
export class <%= namePascal %>Controller {
  constructor(
    private readonly service: <%= namePascal %>Service
  ) {
    // TODO: ...
  }

  @Get('/<%= name %>')
  getData() {
    return this.service.getData();
  }
}
