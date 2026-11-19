import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomPrompt } from './custom-prompt.entity.ts';
import { CustomPromptsRepository } from './custom-prompts.repository.ts';

/**
 * @description Registers {@link CustomPrompt} on the default connection and provides
 * {@link CustomPromptsRepository}.
 * @public
 */
@Module({
  exports: [CustomPromptsRepository],
  imports: [TypeOrmModule.forFeature([CustomPrompt])],
  providers: [CustomPromptsRepository],
})
export class CustomPromptsModule {}
