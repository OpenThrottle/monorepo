import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Module({
  controllers: [],
  exports: [UsersService],
  imports: [LoggerModule, TypeOrmModule.forFeature([User])],
  providers: [UsersService],
})
export class UsersModule {}
