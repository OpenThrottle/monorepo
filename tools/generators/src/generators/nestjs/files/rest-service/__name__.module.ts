import { Module as ModuleDecorator } from '@nestjs/common';
import { <%= namePascal %>Controller } from './<%= name %>.controller';
import { <%= namePascal %>Service } from './<%= name %>.service';

@ModuleDecorator({
  controllers: [<%= namePascal %>Controller],
  // exports: [],
  imports: [],
  providers: [<%= namePascal %>Service],
})
export class Module {}
