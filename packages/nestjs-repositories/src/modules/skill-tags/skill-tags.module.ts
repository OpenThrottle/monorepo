import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { SkillTagsService } from './skill-tags.service';
import { UserSkillTag } from './user-skill-tag.entity';

@Module({
  controllers: [],
  exports: [SkillTagsService],
  imports: [LoggerModule, TypeOrmModule.forFeature([UserSkillTag])],
  providers: [SkillTagsService],
})
export class SkillTagsModule {}
