/**
 * @description The shared bounded git runner. Import it wherever a service shells out to git.
 */

import { Module } from '@nestjs/common';

import { GitRunnerService } from './git-runner.service.ts';

@Module({
  exports: [GitRunnerService],
  providers: [GitRunnerService],
})
export class GitRunnerModule {}
