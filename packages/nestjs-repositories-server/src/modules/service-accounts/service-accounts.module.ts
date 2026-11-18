import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ServiceAccount } from './service-account.entity.ts';
import { ServiceAccountsRepository } from './service-accounts.repository.ts';

/**
 * @description Registers {@link ServiceAccount} on the default connection and provides
 * {@link ServiceAccountsRepository}.
 * @public
 */
@Module({
  exports: [ServiceAccountsRepository],
  imports: [TypeOrmModule.forFeature([ServiceAccount])],
  providers: [ServiceAccountsRepository],
})
export class ServiceAccountsModule {}
