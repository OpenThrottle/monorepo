import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { PlanCreationService } from './plan-creation.service';

@Module({
  exports: [PlanCreationService],
  imports: [LoggerModule, NestjsRepositoriesModule],
  providers: [PlanCreationService],
})
export class PlanCreationModule {}
