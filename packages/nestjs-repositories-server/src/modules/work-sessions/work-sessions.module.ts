import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkSession } from './work-session.entity.ts';
import { WorkSessionsRepository } from './work-sessions.repository.ts';

/**
 * @description Registers {@link WorkSession} on the default connection and provides
 * {@link WorkSessionsRepository}.
 * @public
 */
@Module({
  exports: [WorkSessionsRepository],
  imports: [TypeOrmModule.forFeature([WorkSession])],
  providers: [WorkSessionsRepository],
})
export class WorkSessionsModule {}
