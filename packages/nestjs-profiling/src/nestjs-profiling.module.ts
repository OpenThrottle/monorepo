import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';

@Module({
  controllers: [],
  exports: [],
  imports: [LoggerModule],
  providers: [],
})
export class NestjsProfilingModule {}
