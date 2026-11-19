import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  NestjsRepositoriesServerModule,
  PlansModule,
  UserDisabledAgentClisModule,
} from '@openthrottle/nestjs-repositories-server';

import { CheckoutPathResolutionModule } from '../checkout-path-resolution/checkout-path-resolution.module.ts';
import { EffectiveUserResolutionModule } from '../effective-user-resolution/effective-user-resolution.module.ts';
import { PlanCreationService } from './plan-creation.service.ts';

@Module({
  exports: [PlanCreationService],
  imports: [
    UserDisabledAgentClisModule,
    CheckoutPathResolutionModule,
    EffectiveUserResolutionModule,
    LoggerModule,
    NestjsRepositoriesServerModule,
    PlansModule,
  ],
  providers: [PlanCreationService],
})
export class PlanCreationModule {}
