import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserFavoriteProject } from './user-favorite-project.entity.ts';
import { UserFavoriteProjectsRepository } from './user-favorite-projects.repository.ts';

/**
 * @description Registers {@link UserFavoriteProject} on the default connection and provides
 * {@link UserFavoriteProjectsRepository}.
 * @public
 */
@Module({
  exports: [UserFavoriteProjectsRepository],
  imports: [TypeOrmModule.forFeature([UserFavoriteProject])],
  providers: [UserFavoriteProjectsRepository],
})
export class UserFavoriteProjectsModule {}
