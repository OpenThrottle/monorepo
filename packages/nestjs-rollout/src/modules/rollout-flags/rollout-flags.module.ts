/**
 * @description NestJS module owning the rollout feature-flag domain. Registers the
 * RolloutFlag repository and RolloutService, and imports NestjsRepositoriesModule so
 * RolloutService can resolve the actor's roles via RolesService for role-targeted
 * evaluation. The GraphQL resolver lives in the app (openthrottle-server).
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { RolloutFlag } from './rollout-flag.entity';
import { RolloutService } from './rollout.service';

@Module({
  controllers: [],
  exports: [RolloutService],
  imports: [
    LoggerModule,
    NestjsRepositoriesModule,
    TypeOrmModule.forFeature([RolloutFlag]),
  ],
  providers: [RolloutService],
})
export class RolloutFlagsModule {}
