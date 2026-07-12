import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { ProjectSkill } from './project-skill.entity';
import { ProjectSkillsService } from './project-skills.service';

@Module({
  controllers: [],
  exports: [ProjectSkillsService],
  imports: [LoggerModule, TypeOrmModule.forFeature([ProjectSkill])],
  providers: [ProjectSkillsService],
})
export class ProjectSkillsModule {}
