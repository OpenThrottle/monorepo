/**
 * @description GraphQL module that registers CommitLinksResolver and imports NestjsRepositoriesModule for CommitLinksService.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { CommitLinksResolver } from './commit-links.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [CommitLinksResolver],
})
export class CommitLinksGraphqlModule {}
