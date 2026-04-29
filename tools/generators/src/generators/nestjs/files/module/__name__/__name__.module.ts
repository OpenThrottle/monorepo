import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { <%= namePascal %>Service } from './<%= name %>.service';

@Module({
  controllers: [],
  exports: [<%= namePascal %>Service],
  imports: [LoggerModule],
  providers: [<%= namePascal %>Service],
})
export class <%= namePascal %>Module {}
