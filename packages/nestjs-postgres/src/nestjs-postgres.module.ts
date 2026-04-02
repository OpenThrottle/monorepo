import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { NestjsPostgresService } from './nestjs-postgres.service';

@Module({
  controllers: [],
  exports: [NestjsPostgresService],
  imports: [LoggerModule],
  providers: [NestjsPostgresService],
})
export class NestjsPostgresModule {}
