/**
 * @description NestJS module for per-user preferences (default editor, default agent).
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { UserPreferences } from './user-preferences.entity.ts';
import { UserPreferencesService } from './user-preferences.service.ts';

@Module({
  controllers: [],
  exports: [UserPreferencesService],
  imports: [LoggerModule, TypeOrmModule.forFeature([UserPreferences])],
  providers: [UserPreferencesService],
})
export class UserPreferencesModule {}
