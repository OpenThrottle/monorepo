import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { PlanContextAvailabilityService } from './plan-context-availability.service';

/**
 * @description Provides {@link PlanContextAvailabilityService}, shared by the
 * skillAvailability GraphQL read (planId/taskId context) and the inject-task
 * executor's candidate-set gating.
 */
@Module({
  exports: [PlanContextAvailabilityService],
  imports: [LoggerModule, NestjsRepositoriesModule],
  providers: [PlanContextAvailabilityService],
})
export class PlanContextAvailabilityModule {}
