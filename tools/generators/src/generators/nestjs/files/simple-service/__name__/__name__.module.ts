/**
 * @description NestJS module for <%= name %>. Register this module where the
 * service is needed (e.g. `app.module.ts`).
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { <%= namePascal %>Service } from './<%= name %>.service.ts';

@Module({
  exports: [<%= namePascal %>Service],
  imports: [LoggerModule],
  providers: [<%= namePascal %>Service],
})
export class <%= namePascal %>Module {}
