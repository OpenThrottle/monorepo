import { Module } from '@nestjs/common';
import { GitHubModule } from '@openthrottle/nestjs-github';

import { GitHubForgeService } from './github-forge/github-forge.service.ts';
import { GitLabForgeService } from './gitlab-forge/gitlab-forge.service.ts';
import { SourceControlService } from './source-control.service.ts';

/**
 * @description The forge abstraction for the work ledger: `SourceControlService` picks a forge, and
 * one `*-forge` service per forge implements it. Import this instead of `GitHubModule` wherever the
 * ledger talks to a forge.
 */
@Module({
  exports: [SourceControlService],
  imports: [GitHubModule],
  providers: [GitHubForgeService, GitLabForgeService, SourceControlService],
})
export class SourceControlModule {}
