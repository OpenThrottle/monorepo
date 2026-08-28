import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { CheckoutPathResolutionModule } from '../checkout-path-resolution/checkout-path-resolution.module';
import { EffectiveUserResolutionModule } from '../effective-user-resolution/effective-user-resolution.module';
import { PlanCreationService } from './plan-creation.service';

@Module({
  exports: [PlanCreationService],
  imports: [
    CheckoutPathResolutionModule,
    EffectiveUserResolutionModule,
    LoggerModule,
    NestjsRepositoriesModule,
  ],
  providers: [PlanCreationService],
})
export class PlanCreationModule {}
