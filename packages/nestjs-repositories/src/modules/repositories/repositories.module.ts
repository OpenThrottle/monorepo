import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { RepositoriesService } from './repositories.service';
import { Repository } from './repository.entity';
import { RepositoryCheckout } from './repository-checkout.entity';
import { RepositoryCheckoutsService } from './repository-checkouts.service';

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
