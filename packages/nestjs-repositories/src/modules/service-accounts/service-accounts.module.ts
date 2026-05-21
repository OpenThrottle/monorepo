/**
 * @description NestJS module for service account entities and credential lifecycle.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { ServiceAccountCredential } from './service-account-credential.entity';
import { ServiceAccount } from './service-account.entity';
import { ServiceAccountsService } from './service-accounts.service';

@Module({
  controllers: [],
  exports: [ServiceAccountsService, TypeOrmModule],
  imports: [
    LoggerModule,
    TypeOrmModule.forFeature([ServiceAccount, ServiceAccountCredential]),
  ],
  providers: [ServiceAccountsService],
})
export class ServiceAccountsModule {}
