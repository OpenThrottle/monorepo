import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { EvalCase } from './eval-case.entity.ts';
import { EvalDataset } from './eval-dataset.entity.ts';
import { EvalDatasetsService } from './eval-datasets.service.ts';

@Module({
  controllers: [],
  exports: [EvalDatasetsService],
  imports: [LoggerModule, TypeOrmModule.forFeature([EvalCase, EvalDataset])],
  providers: [EvalDatasetsService],
})
export class EvalDatasetsModule {}
