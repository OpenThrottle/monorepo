import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkSessionSubject } from './work-session-subject.entity.ts';
import { WorkSessionSubjectsRepository } from './work-session-subjects.repository.ts';

/**
 * @description Registers {@link WorkSessionSubject} on the default connection and provides
 * {@link WorkSessionSubjectsRepository}.
 * @public
 */
@Module({
  exports: [WorkSessionSubjectsRepository],
  imports: [TypeOrmModule.forFeature([WorkSessionSubject])],
  providers: [WorkSessionSubjectsRepository],
})
export class WorkSessionSubjectsModule {}
