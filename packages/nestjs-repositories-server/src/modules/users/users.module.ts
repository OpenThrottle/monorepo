import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './user.entity.ts';
import { UsersRepository } from './users.repository.ts';

/**
 * @description Registers {@link User} on the default connection and provides
 * {@link UsersRepository}.
 * @public
 */
@Module({
  exports: [UsersRepository],
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersRepository],
})
export class UsersModule {}
