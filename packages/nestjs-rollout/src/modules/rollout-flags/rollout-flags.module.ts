/**
 * @description NestJS module owning the rollout feature-flag domain. Registers the
 * RolloutFlag repository and RolloutService, and imports RolesModule so
 * RolloutService can resolve the actor's roles via RolesRepository for role-targeted
 * evaluation. The GraphQL resolver lives in the app (openthrottle-server).
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { RolesModule } from '@openthrottle/nestjs-repositories-server';

import { RolloutFlag } from './rollout-flag.entity.ts';
import { RolloutService } from './rollout-flags.service.ts';

@Module({
  controllers: [],
  exports: [RolloutService],
  imports: [LoggerModule, RolesModule, TypeOrmModule.forFeature([RolloutFlag])],
  providers: [RolloutService],
})
export class RolloutFlagsModule {}
