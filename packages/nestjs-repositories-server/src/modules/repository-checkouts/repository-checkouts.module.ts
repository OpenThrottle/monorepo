import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RepositoryCheckout } from './repository-checkout.entity.ts';
import { RepositoryCheckoutsRepository } from './repository-checkouts.repository.ts';

/**
 * @description Registers {@link RepositoryCheckout} on the default connection and provides
 * {@link RepositoryCheckoutsRepository}.
 * @public
 */
@Module({
  exports: [RepositoryCheckoutsRepository],
  imports: [TypeOrmModule.forFeature([RepositoryCheckout])],
  providers: [RepositoryCheckoutsRepository],
})
export class RepositoryCheckoutsModule {}
