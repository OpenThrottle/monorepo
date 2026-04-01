import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { CommitLink } from './commit-link.entity';
import { CommitLinksService } from './commit-links.service';

@Module({
  controllers: [],
  exports: [CommitLinksService],
  imports: [LoggerModule, TypeOrmModule.forFeature([CommitLink])],
  providers: [CommitLinksService],
})
export class CommitLinksModule {}
