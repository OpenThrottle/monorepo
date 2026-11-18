import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserPreferences } from './user-preferences.entity.ts';
import { UserPreferencesRepository } from './user-preferences.repository.ts';

/**
 * @description Registers {@link UserPreferences} on the default connection and provides
 * {@link UserPreferencesRepository}.
 * @public
 */
@Module({
  exports: [UserPreferencesRepository],
  imports: [TypeOrmModule.forFeature([UserPreferences])],
  providers: [UserPreferencesRepository],
})
export class UserPreferencesModule {}
