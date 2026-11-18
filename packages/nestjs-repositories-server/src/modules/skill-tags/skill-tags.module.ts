import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SkillTagsRepository } from './skill-tags.repository.ts';
import { UserSkillTag } from './user-skill-tag.entity.ts';

/**
 * @description Registers {@link UserSkillTag} on the default connection and provides
 * {@link SkillTagsRepository}.
 * @public
 */
@Module({
  exports: [SkillTagsRepository],
  imports: [TypeOrmModule.forFeature([UserSkillTag])],
  providers: [SkillTagsRepository],
})
export class SkillTagsModule {}
