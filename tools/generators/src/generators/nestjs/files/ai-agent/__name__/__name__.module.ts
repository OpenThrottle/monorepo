import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { <%= namePascal %>Service } from './<%= name %>.service';

@Module({
  controllers: [],
  exports: [<%= namePascal %>Service],
  imports: [LoggerModule],
  providers: [<%= namePascal %>Service, ConfigService, LoggerService],
})
export class <%= namePascal %>Module {}
