import type {
  TaggingClassificationInput,
  TaggingModelProvider,
  TaggingPrediction,
  TaggingVocabularyEntry,
} from './tagging.types.ts';
import { fetchWithTimeout, withOneRetry } from './tagging.utils.ts';
import { buildTaggingPrompt, parseTaggingResponse } from './tagging.utils.ts';
const readOllamaMessageText = (body: unknown): string => {
  if (typeof body !== 'object' || body === null) return '';
  if (!('message' in body)) return '';
  const { message } = body;
  if (typeof message !== 'object' || message === null) return '';
  if (!('content' in message)) return '';
  if (typeof message.content !== 'string') return '';
  return message.content;
};

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
      const text = readOllamaMessageText(body);
      return parseTaggingResponse(text);
    });
  }
}
