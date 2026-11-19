import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EvalCase } from './eval-case.entity.ts';
import { EvalCasesRepository } from './eval-cases.repository.ts';

/**
 * @description Registers {@link EvalCase} on the default connection and provides
 * {@link EvalCasesRepository}.
 * @public
 */
@Module({
  exports: [EvalCasesRepository],
  imports: [TypeOrmModule.forFeature([EvalCase])],
  providers: [EvalCasesRepository],
})
export class EvalCasesModule {}
