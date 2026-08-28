import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { EffectiveUserResolutionService } from './effective-user-resolution.service';

@Module({
  exports: [EffectiveUserResolutionService],
  imports: [LoggerModule, NestjsRepositoriesModule],
  providers: [EffectiveUserResolutionService],
})
export class EffectiveUserResolutionModule {}
