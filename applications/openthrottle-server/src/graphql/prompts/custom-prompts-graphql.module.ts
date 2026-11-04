/**
 * @description GraphQL module that registers CustomPromptsResolver and imports NestjsRepositoriesModule for CustomPromptsService.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { AgentAssetSearchResolver } from './agent-asset-search.resolver.ts';
import { CustomPromptsResolver } from './custom-prompts.resolver.ts';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [AgentAssetSearchResolver, CustomPromptsResolver],
})
export class CustomPromptsGraphqlModule {}
