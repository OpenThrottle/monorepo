import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EvalCase } from '../eval-cases/eval-case.entity.ts';
import { EvalDataset } from './eval-dataset.entity.ts';
import { EvalDatasetsRepository } from './eval-datasets.repository.ts';

/**
 * @description Registers {@link EvalDataset} (and {@link EvalCase}, which dataset creation writes
 * in the same transaction) on the default connection and provides
 * {@link EvalDatasetsRepository}.
 * @public
 */
@Module({
  exports: [EvalDatasetsRepository],
  imports: [TypeOrmModule.forFeature([EvalCase, EvalDataset])],
  providers: [EvalDatasetsRepository],
})
export class EvalDatasetsModule {}
