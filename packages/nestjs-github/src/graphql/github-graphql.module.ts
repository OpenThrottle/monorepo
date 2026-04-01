/**
 * @description GraphQL feature module for GitHub (pulls and stats). Registers
 * the GitHub query resolver and stats service. Import this module alongside a
 * root GraphQL setup (e.g. `NestjsGraphqlModule.forRoot()`) and
 * `ConfigModule` (often global) so `GitHubService` can read `GITHUB_TOKEN`.
 * Re-exports `GitHubModule` so consumers may inject `GitHubService` where needed.
 */

import { Module } from '@nestjs/common';
import { GitHubModule } from '../github/github.module';
import { GithubResolver } from './github.resolver';
import { GitHubStatsService } from './github-stats.service';

@Module({
  exports: [GitHubModule],
  imports: [GitHubModule],
  providers: [GithubResolver, GitHubStatsService],
})
export class GithubGraphqlModule {}
