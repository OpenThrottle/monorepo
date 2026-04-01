/**
 * @description GraphQL module that registers CustomPromptsResolver and imports NestjsRepositoriesModule for CustomPromptsService.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { CustomPromptsResolver } from './custom-prompts.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [CustomPromptsResolver],
})
export class CustomPromptsGraphqlModule {}
