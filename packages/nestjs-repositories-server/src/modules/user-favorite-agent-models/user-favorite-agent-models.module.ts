import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserFavoriteAgentModel } from './user-favorite-agent-model.entity.ts';
import { UserFavoriteAgentModelsRepository } from './user-favorite-agent-models.repository.ts';

/**
 * @description Registers {@link UserFavoriteAgentModel} on the default connection and provides
 * {@link UserFavoriteAgentModelsRepository}.
 * @public
 */
@Module({
  exports: [UserFavoriteAgentModelsRepository],
  imports: [TypeOrmModule.forFeature([UserFavoriteAgentModel])],
  providers: [UserFavoriteAgentModelsRepository],
})
export class UserFavoriteAgentModelsModule {}
