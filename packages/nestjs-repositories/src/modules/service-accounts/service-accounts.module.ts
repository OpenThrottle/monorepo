/**
 * @description NestJS module for service account entities (schema slice). Services added in later plan tasks.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceAccountCredential } from './service-account-credential.entity';
import { ServiceAccount } from './service-account.entity';

@Module({
  controllers: [],
  exports: [TypeOrmModule],
  imports: [
    TypeOrmModule.forFeature([ServiceAccount, ServiceAccountCredential]),
  ],
  providers: [],
})
export class ServiceAccountsModule {}
