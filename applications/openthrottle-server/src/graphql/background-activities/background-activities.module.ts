/**
 * @description GraphQL feature module for background activities (OT plan 5767e798).
 */

import { Module } from '@nestjs/common';

import { BackgroundActivityRegistryModule } from '../../services/background-activity-registry/background-activity-registry.module.ts';
import { BackgroundActivitiesResolver } from './background-activities.resolver.ts';
import { BackgroundActivitiesService } from './background-activities.service.ts';

@Module({
  imports: [BackgroundActivityRegistryModule],
  providers: [BackgroundActivitiesResolver, BackgroundActivitiesService],
})
export class BackgroundActivitiesGraphqlModule {}
