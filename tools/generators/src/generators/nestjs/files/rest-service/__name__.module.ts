import { Module } from '@nestjs/common';
import { <%= namePascal %>Controller } from './<%= name %>.controller';
import { <%= namePascal %>Service } from './<%= name %>.service';

@Module({
  controllers: [<%= namePascal %>Controller],
  // exports: [],
  imports: [],
  providers: [<%= namePascal %>Service],
})
export class <%= namePascal %>Module {}
