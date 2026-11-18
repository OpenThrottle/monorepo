import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PlanMessage } from './plan-message.entity.ts';
import { PlanMessagesRepository } from './plan-messages.repository.ts';

/**
 * @description Registers {@link PlanMessage} on the default connection and provides
 * {@link PlanMessagesRepository}.
 * @public
 */
@Module({
  exports: [PlanMessagesRepository],
  imports: [TypeOrmModule.forFeature([PlanMessage])],
  providers: [PlanMessagesRepository],
})
export class PlanMessagesModule {}
