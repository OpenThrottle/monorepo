/**
 * @description Service for custom_prompts table. Provides repository access and file system persistence.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';
import { CustomPrompt } from './custom-prompt.entity';

@Injectable()
export class CustomPromptsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(CustomPrompt)
    private readonly customPromptRepository: Repository<CustomPrompt>,
  ) {
    this.logger.debug('🧩 custom-prompts 🧩');
  }

  /**
   * @description Returns the TypeORM repository for custom prompts. Use for CRUD and queries.
   */
  getRepository(): Repository<CustomPrompt> {
    return this.customPromptRepository;
  }
}
