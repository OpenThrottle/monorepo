import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RuleApplication } from './rule-application.entity.ts';
import { RuleApplicationsRepository } from './rule-applications.repository.ts';

/**
 * @description Registers {@link RuleApplication} on the default connection and provides
 * {@link RuleApplicationsRepository}.
 * @public
 */
@Module({
  exports: [RuleApplicationsRepository],
  imports: [TypeOrmModule.forFeature([RuleApplication])],
  providers: [RuleApplicationsRepository],
})
export class RuleApplicationsModule {}
