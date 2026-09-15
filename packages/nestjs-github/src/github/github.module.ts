import { Module } from '@nestjs/common';

import { GitHubController } from './github.controller.ts';
import { GitHubService } from './github.service.ts';

@Module({
  controllers: [GitHubController],
  exports: [GitHubService],
  providers: [GitHubService],
})
export class GitHubModule {}
