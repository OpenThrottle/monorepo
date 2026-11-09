import type {
  TaggingClassificationInput,
  TaggingModelProvider,
  TaggingPrediction,
  TaggingVocabularyEntry,
} from './tagging.types.ts';
import { fetchWithTimeout, withOneRetry } from './tagging.utils.ts';
import { buildTaggingPrompt, parseTaggingResponse } from './tagging.utils.ts';
const readAnthropicBlockText = (block: unknown): string => {
  if (typeof block !== 'object' || block === null) return '';
  if (!('text' in block)) return '';
  if (typeof block.text !== 'string') return '';
  return block.text;
};

const readAnthropicContentBlocks = (body: unknown): unknown[] => {
  if (typeof body !== 'object' || body === null) return [];
  if (!('content' in body)) return [];
  if (!Array.isArray(body.content)) return [];
  return body.content;
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
      const content = readAnthropicContentBlocks(body);
      const text = content.map(readAnthropicBlockText).join('');
      return parseTaggingResponse(text);
    });
  }
}
