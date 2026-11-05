import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { PlanMessage } from './plan-message.entity.ts';
import { PlanMessagesService } from './plan-messages.service.ts';

@Module({
  controllers: [],
  exports: [PlanMessagesService],
  imports: [LoggerModule, TypeOrmModule.forFeature([PlanMessage])],
  providers: [PlanMessagesService],
})
export class PlanMessagesModule {}
