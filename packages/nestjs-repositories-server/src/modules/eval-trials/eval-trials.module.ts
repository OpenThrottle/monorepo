import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EvalTrial } from './eval-trial.entity.ts';
import { EvalTrialsRepository } from './eval-trials.repository.ts';

/**
 * @description Registers {@link EvalTrial} on the default connection and provides
 * {@link EvalTrialsRepository}.
 * @public
 */
@Module({
  exports: [EvalTrialsRepository],
  imports: [TypeOrmModule.forFeature([EvalTrial])],
  providers: [EvalTrialsRepository],
})
export class EvalTrialsModule {}
