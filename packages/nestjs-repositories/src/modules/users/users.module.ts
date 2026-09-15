import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { User } from './user.entity.ts';
import { UsersService } from './users.service.ts';

@Module({
  controllers: [],
  exports: [UsersService],
  imports: [LoggerModule, TypeOrmModule.forFeature([User])],
  providers: [UsersService],
})
export class UsersModule {}
