import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsTestingService } from './nestjs-testing.service';

@Module({
  controllers: [],
  exports: [NestjsTestingService],
  imports: [LoggerModule],
  providers: [NestjsTestingService],
})
export class NestjsTestingModule {}
