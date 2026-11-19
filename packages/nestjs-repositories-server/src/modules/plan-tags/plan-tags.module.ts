import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PlanTag } from './plan-tag.entity.ts';
import { PlanTagsRepository } from './plan-tags.repository.ts';

/**
 * @description Registers {@link PlanTag} on the default connection and provides
 * {@link PlanTagsRepository}.
 * @public
 */
@Module({
  exports: [PlanTagsRepository],
  imports: [TypeOrmModule.forFeature([PlanTag])],
  providers: [PlanTagsRepository],
})
export class PlanTagsModule {}
