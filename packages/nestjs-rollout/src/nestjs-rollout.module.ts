import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRolloutService } from './nestjs-rollout.service';

@Module({
  controllers: [],
  exports: [NestjsRolloutService],
  imports: [LoggerModule],
  providers: [NestjsRolloutService],
})
export class NestjsRolloutModule {}
