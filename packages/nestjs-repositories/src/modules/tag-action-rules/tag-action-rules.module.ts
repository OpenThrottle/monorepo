import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { RuleApplication } from './rule-application.entity';
import { RuleApplicationsService } from './rule-applications.service';
import { TagActionRule } from './tag-action-rule.entity';
import { TagActionRulesService } from './tag-action-rules.service';

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
