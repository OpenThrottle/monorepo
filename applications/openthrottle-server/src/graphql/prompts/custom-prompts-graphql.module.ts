/**
 * @description GraphQL module that registers CustomPromptsResolver and imports NestjsRepositoriesModule for CustomPromptsService.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { AgentAssetSearchResolver } from './agent-asset-search.resolver';
import { CustomPromptsResolver } from './custom-prompts.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [AgentAssetSearchResolver, CustomPromptsResolver],
})
export class CustomPromptsGraphqlModule {}
