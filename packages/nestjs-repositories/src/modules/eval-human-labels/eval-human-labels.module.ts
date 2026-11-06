import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { EvalHumanLabel } from './eval-human-label.entity.ts';
import { EvalHumanLabelsService } from './eval-human-labels.service.ts';

@Module({
  controllers: [],
  exports: [EvalHumanLabelsService],
  imports: [LoggerModule, TypeOrmModule.forFeature([EvalHumanLabel])],
  providers: [EvalHumanLabelsService],
})
export class EvalHumanLabelsModule {}
