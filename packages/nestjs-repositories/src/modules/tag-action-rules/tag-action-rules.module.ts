import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { RuleApplication } from './rule-application.entity.ts';
import { RuleApplicationsService } from './rule-applications.service.ts';
import { TagActionRule } from './tag-action-rule.entity.ts';
import { TagActionRulesService } from './tag-action-rules.service.ts';

@Module({
  controllers: [],
  exports: [RuleApplicationsService, TagActionRulesService],
  imports: [
    LoggerModule,
    TypeOrmModule.forFeature([RuleApplication, TagActionRule]),
  ],
  providers: [RuleApplicationsService, TagActionRulesService],
})
export class TagActionRulesModule {}
