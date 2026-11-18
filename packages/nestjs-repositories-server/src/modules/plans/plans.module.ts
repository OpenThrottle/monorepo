import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Plan } from './plan.entity.ts';
import { PlansRepository } from './plans.repository.ts';

/**
 * @description Registers {@link Plan} on the default connection and provides
 * {@link PlansRepository}.
 * @public
 */
@Module({
  exports: [PlansRepository],
  imports: [TypeOrmModule.forFeature([Plan])],
  providers: [PlansRepository],
})
export class PlansModule {}
