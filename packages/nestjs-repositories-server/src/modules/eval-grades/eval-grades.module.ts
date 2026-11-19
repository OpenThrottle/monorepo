import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EvalGrade } from './eval-grade.entity.ts';
import { EvalGradesRepository } from './eval-grades.repository.ts';

/**
 * @description Registers {@link EvalGrade} on the default connection and provides
 * {@link EvalGradesRepository}.
 * @public
 */
@Module({
  exports: [EvalGradesRepository],
  imports: [TypeOrmModule.forFeature([EvalGrade])],
  providers: [EvalGradesRepository],
})
export class EvalGradesModule {}
