import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  PlansModule,
  ProjectRepositoriesModule,
  ProjectsModule,
} from '@openthrottle/nestjs-repositories-server';

import { PlanProjectMembershipService } from './plan-project-membership.service.ts';

@Module({
  exports: [PlanProjectMembershipService],
  imports: [
    LoggerModule,
    PlansModule,
    ProjectRepositoriesModule,
    ProjectsModule,
  ],
  providers: [PlanProjectMembershipService],
})
export class PlanProjectMembershipModule {}
