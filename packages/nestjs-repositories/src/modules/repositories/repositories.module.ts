import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { RepositoriesService } from './repositories.service.ts';
import { Repository } from './repository.entity.ts';
import { RepositoryCheckout } from './repository-checkout.entity.ts';
import { RepositoryCheckoutsService } from './repository-checkouts.service.ts';

@Module({
  controllers: [],
  exports: [RepositoriesService, RepositoryCheckoutsService],
  imports: [
    LoggerModule,
    TypeOrmModule.forFeature([Repository, RepositoryCheckout]),
  ],
  providers: [RepositoriesService, RepositoryCheckoutsService],
})
export class RepositoriesModule {}
