import { Module } from '@nestjs/common';
import { GitHubController } from './github.controller';
import { GitHubService } from './github.service';

@Module({
  controllers: [GitHubController],
  exports: [GitHubService],
  providers: [GitHubService],
})
export class GitHubModule {}
