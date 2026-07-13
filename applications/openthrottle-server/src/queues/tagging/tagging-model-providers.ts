/**
 * @description Concrete {@link TaggingModelProvider} implementations plus the
 * env-driven factory. Selection via TAGGING_MODEL_PROVIDER:
 * - `hosted` (default): Anthropic small model via ANTHROPIC_API_KEY
 *   (TAGGING_MODEL, default claude-haiku-4-5-20251001); strict JSON, one
 *   retry then throw (the processor logs and skips).
 * - `ollama`: local Ollama chat endpoint (OLLAMA_BASE_URL, TAGGING_MODEL).
 * - `stub`: deterministic keyword matcher over the vocabulary — offline dev
 *   and E2E without a model dependency.
 * - `disabled`: classify() always returns [] (jobs no-op).
 *
 * A hosted selection without an API key degrades to `disabled` with a warning
 * rather than failing boot.
 */

import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  buildTaggingPrompt,
  parseTaggingResponse,
  TAGGING_MODEL_PROVIDER_TOKEN,
  type TaggingClassificationInput,
  type TaggingModelProvider,
  type TaggingPrediction,
  type TaggingVocabularyEntry,
} from './tagging-model.provider';

const HOSTED_DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const OLLAMA_DEFAULT_BASE_URL = 'http://localhost:11434';
const REQUEST_TIMEOUT_MS = 30_000;

const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const withOneRetry = async (
  attempt: () => Promise<TaggingPrediction[]>,
): Promise<TaggingPrediction[]> => {
  try {
    return await attempt();
  } catch {
    return attempt();
  }
};

export class HostedTaggingModelProvider implements TaggingModelProvider {
  readonly name = 'hosted';

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async classify(
    input: TaggingClassificationInput,
    vocabulary: readonly TaggingVocabularyEntry[],
  ): Promise<TaggingPrediction[]> {
    return withOneRetry(async () => {
      const response = await fetchWithTimeout(
        'https://api.anthropic.com/v1/messages',
        {
          body: JSON.stringify({
            max_tokens: 512,
            messages: [
              { content: buildTaggingPrompt(input, vocabulary), role: 'user' },
            ],
            model: this.model,
          }),
          headers: {
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'x-api-key': this.apiKey,
          },
          method: 'POST',
        },
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Anthropic API error ${response.status}: ${text.slice(0, 200)}`,
        );
      }
      const body: unknown = await response.json();
      const content =
        typeof body === 'object' &&
        body !== null &&
        'content' in body &&
        Array.isArray(body.content)
          ? body.content
          : [];
      const text = content
        .map((block: unknown) =>
          typeof block === 'object' &&
          block !== null &&
          'text' in block &&
          typeof block.text === 'string'
            ? block.text
            : '',
        )
        .join('');
      return parseTaggingResponse(text);
    });
  }
}

export class OllamaTaggingModelProvider implements TaggingModelProvider {
  readonly name = 'ollama';

  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async classify(
    input: TaggingClassificationInput,
    vocabulary: readonly TaggingVocabularyEntry[],
  ): Promise<TaggingPrediction[]> {
    return withOneRetry(async () => {
      const response = await fetchWithTimeout(`${this.baseUrl}/api/chat`, {
        body: JSON.stringify({
          format: 'json',
          messages: [
            { content: buildTaggingPrompt(input, vocabulary), role: 'user' },
          ],
          model: this.model,
          stream: false,
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Ollama API error ${response.status}: ${text.slice(0, 200)}`,
        );
      }
      const body: unknown = await response.json();
      const message =
        typeof body === 'object' && body !== null && 'message' in body
          ? body.message
          : null;
      const text =
        typeof message === 'object' &&
        message !== null &&
        'content' in message &&
        typeof message.content === 'string'
          ? message.content
          : '';
      return parseTaggingResponse(text);
    });
  }
}

/**
 * @description Deterministic keyword matcher: a vocabulary tag is predicted
 * when its name (hyphens treated as spaces) appears in the input text.
 * Confidence is fixed at 0.5 to make stub-sourced rows recognizable.
 */
export class StubTaggingModelProvider implements TaggingModelProvider {
  readonly name = 'stub';

  classify(
    input: TaggingClassificationInput,
    vocabulary: readonly TaggingVocabularyEntry[],
  ): Promise<TaggingPrediction[]> {
    const haystack = [
      input.title,
      input.summary ?? '',
      input.description ?? '',
      input.diff ?? '',
    ]
      .join('\n')
      .toLowerCase();

    const predictions = vocabulary
      .filter((entry) => {
        const needle = entry.tag.split('-').join(' ');
        return (
          haystack.includes(entry.tag.toLowerCase()) ||
          haystack.includes(needle.toLowerCase())
        );
      })
      .map(
        (entry): TaggingPrediction => ({
          confidence: 0.5,
          dimension: entry.dimension,
          tag: entry.tag,
        }),
      );
    return Promise.resolve(predictions);
  }
}

export class DisabledTaggingModelProvider implements TaggingModelProvider {
  readonly name = 'disabled';

  classify(): Promise<TaggingPrediction[]> {
    return Promise.resolve([]);
  }
}

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
