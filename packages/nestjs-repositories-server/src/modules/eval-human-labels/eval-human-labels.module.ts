import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EvalHumanLabel } from './eval-human-label.entity.ts';
import { EvalHumanLabelsRepository } from './eval-human-labels.repository.ts';

/**
 * @description Registers {@link EvalHumanLabel} on the default connection and provides
 * {@link EvalHumanLabelsRepository}.
 * @public
 */
@Module({
  exports: [EvalHumanLabelsRepository],
  imports: [TypeOrmModule.forFeature([EvalHumanLabel])],
  providers: [EvalHumanLabelsRepository],
})
export class EvalHumanLabelsModule {}
