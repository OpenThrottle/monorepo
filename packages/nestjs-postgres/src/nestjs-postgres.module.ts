import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';

@Module({
  controllers: [],
  exports: [],
  imports: [LoggerModule],
  providers: [],
})
export class NestjsPostgresModule {}
