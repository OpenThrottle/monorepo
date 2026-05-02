/**
 * @description NestJS module for custom prompts repository.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { CustomPrompt } from './custom-prompt.entity';
import { CustomPromptsService } from './custom-prompts.service';

@Module({
  controllers: [],
  exports: [CustomPromptsService],
  imports: [LoggerModule, TypeOrmModule.forFeature([CustomPrompt])],
  providers: [CustomPromptsService],
})
export class CustomPromptsModule {}
