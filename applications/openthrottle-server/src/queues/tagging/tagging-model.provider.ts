import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@openthrottle/nestjs-modules';

import { DisabledTaggingModelProvider } from './disabled-tagging-model.strategy.ts';
import { HostedTaggingModelProvider } from './hosted-tagging-model.strategy.ts';
import { OllamaTaggingModelProvider } from './ollama-tagging-model.strategy.ts';
import { StubTaggingModelProvider } from './stub-tagging-model.strategy.ts';
import type { TaggingModelProvider } from './tagging.types.ts';
import { TAGGING_MODEL_PROVIDER_TOKEN } from './tagging-model.token.ts';

const OLLAMA_DEFAULT_BASE_URL = 'http://localhost:11434';

const HOSTED_DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

/**
 * @description Env-driven provider factory (Nest custom provider).
 */
export const taggingModelProviderFactory = {
  inject: [ConfigService, LoggerService],
  provide: TAGGING_MODEL_PROVIDER_TOKEN,
  useFactory: (
    config: ConfigService,
    logger: LoggerService,
  ): TaggingModelProvider => {
    const selection = config.get<string>('TAGGING_MODEL_PROVIDER') ?? 'hosted';
    const model = config.get<string>('TAGGING_MODEL');

    if (selection === 'disabled') {
      return new DisabledTaggingModelProvider();
    }
    if (selection === 'stub') {
      return new StubTaggingModelProvider();
    }
    if (selection === 'ollama') {
      return new OllamaTaggingModelProvider(
        config.get<string>('OLLAMA_BASE_URL') ?? OLLAMA_DEFAULT_BASE_URL,
        model ?? 'llama3.2',
      );
    }

    const apiKey = config.get<string>('ANTHROPIC_API_KEY');
    if (apiKey == null || apiKey.length === 0) {
      logger.warn(
        'TAGGING_MODEL_PROVIDER=hosted but ANTHROPIC_API_KEY is unset; tagging jobs are disabled',
        'taggingModelProviderFactory',
      );
      return new DisabledTaggingModelProvider();
    }
    return new HostedTaggingModelProvider(
      apiKey,
      model ?? HOSTED_DEFAULT_MODEL,
    );
  },
};
