import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { NestjsExpressService } from './nestjs-express.service';

@Module({
  controllers: [],
  exports: [NestjsExpressService],
  imports: [LoggerModule],
  providers: [NestjsExpressService],
})
export class NestjsExpressModule {}
