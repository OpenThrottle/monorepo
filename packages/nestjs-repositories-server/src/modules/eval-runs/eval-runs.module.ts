import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EvalRun } from './eval-run.entity.ts';
import { EvalRunsRepository } from './eval-runs.repository.ts';

/**
 * @description Registers {@link EvalRun} on the default connection and provides
 * {@link EvalRunsRepository}.
 * @public
 */
@Module({
  exports: [EvalRunsRepository],
  imports: [TypeOrmModule.forFeature([EvalRun])],
  providers: [EvalRunsRepository],
})
export class EvalRunsModule {}
