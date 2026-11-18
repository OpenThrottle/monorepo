/**
 * @description GraphQL module that registers CustomPromptsResolver and imports NestjsRepositoriesModule for CustomPromptsService.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { RolesModule } from '@openthrottle/nestjs-repositories-server';

import { EmbedderModule } from '../../services/embedder/embedder.module.ts';
import { AgentAssetSearchResolver } from './agent-asset-search/agent-asset-search.resolver.ts';
import { CustomPromptsResolver } from './prompts.resolver.ts';

@Module({
  imports: [RolesModule, EmbedderModule, NestjsRepositoriesModule],
  providers: [AgentAssetSearchResolver, CustomPromptsResolver],
})
export class CustomPromptsGraphqlModule {}
