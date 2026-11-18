import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ServiceAccount } from '../service-accounts/service-account.entity.ts';
import { ServiceAccountCredential } from './service-account-credential.entity.ts';
import { ServiceAccountCredentialsRepository } from './service-account-credentials.repository.ts';

/**
 * @description Registers {@link ServiceAccountCredential} (plus the {@link ServiceAccount} it
 * checks before issuing a credential) on the default connection and provides
 * {@link ServiceAccountCredentialsRepository}.
 * @public
 */
@Module({
  exports: [ServiceAccountCredentialsRepository],
  imports: [
    TypeOrmModule.forFeature([ServiceAccount, ServiceAccountCredential]),
  ],
  providers: [ServiceAccountCredentialsRepository],
})
export class ServiceAccountCredentialsModule {}
