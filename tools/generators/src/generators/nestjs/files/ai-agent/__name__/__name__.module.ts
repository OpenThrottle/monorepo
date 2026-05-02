import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { <%= namePascal %>Service } from './<%= name %>.service';

@Module({
  controllers: [],
  exports: [<%= namePascal %>Service],
  imports: [LoggerModule],
  providers: [<%= namePascal %>Service, ConfigService, LoggerService],
})
export class <%= namePascal %>Module {}
