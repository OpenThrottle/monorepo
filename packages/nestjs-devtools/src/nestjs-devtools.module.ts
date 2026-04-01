import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { NestjsDevtoolsService } from './nestjs-devtools.service';

@Module({
  controllers: [],
  exports: [NestjsDevtoolsService],
  imports: [
    LoggerModule,
    DevtoolsModule.registerAsync({
      useFactory: () => ({
        http: process.env.NODE_ENV !== 'production',
      }),
    }),
  ],
  providers: [NestjsDevtoolsService, LoggerService],
})
export class NestjsDevtoolsModule {}
