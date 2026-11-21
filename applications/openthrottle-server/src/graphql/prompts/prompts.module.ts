/**
 * @description GraphQL module that registers CustomPromptsResolver and imports the custom-prompts table module for CustomPromptsRepository.
 */

import { Module } from '@nestjs/common';
import {
  CustomPromptsModule,
  RolesModule,
} from '@openthrottle/nestjs-repositories-server';

import { EffectiveUserResolutionModule } from '../../services/effective-user-resolution/effective-user-resolution.module.ts';
import { EmbedderModule } from '../../services/embedder/embedder.module.ts';
import { AgentAssetSearchResolver } from './agent-asset-search/agent-asset-search.resolver.ts';
import { CustomPromptsResolver } from './prompts.resolver.ts';

@Module({
  imports: [
    CustomPromptsModule,
    EffectiveUserResolutionModule,
    EmbedderModule,
    RolesModule,
  ],
  providers: [AgentAssetSearchResolver, CustomPromptsResolver],
})
export class CustomPromptsGraphqlModule {}
