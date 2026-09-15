import { Module } from '@nestjs/common';
import { <%= namePascal %>Controller } from './<%= name %>.controller.ts';
import { <%= namePascal %>Service } from './<%= name %>.service.ts';

@Module({
  controllers: [<%= namePascal %>Controller],
  // exports: [],
  imports: [],
  providers: [<%= namePascal %>Service],
})
export class <%= namePascal %>Module {}
