import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { SkillTagsModule } from '../skill-tags/skill-tags.module';
import { ProjectSkill } from './project-skill.entity';
import { ProjectSkillsService } from './project-skills.service';

@Module({
  controllers: [],
  exports: [ProjectSkillsService],
  imports: [
    LoggerModule,
    SkillTagsModule,
    TypeOrmModule.forFeature([ProjectSkill]),
  ],
  providers: [ProjectSkillsService],
})
export class ProjectSkillsModule {}
