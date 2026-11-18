import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  ServiceAccountsModule,
  UsersModule,
} from '@openthrottle/nestjs-repositories-server';

import { EffectiveUserResolutionService } from './effective-user-resolution.service.ts';

@Module({
  exports: [EffectiveUserResolutionService],
  imports: [ServiceAccountsModule, UsersModule, LoggerModule],
  providers: [EffectiveUserResolutionService],
})
export class EffectiveUserResolutionModule {}
