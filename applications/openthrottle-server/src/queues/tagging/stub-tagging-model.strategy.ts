import type {
  TaggingClassificationInput,
  TaggingModelProvider,
  TaggingPrediction,
  TaggingVocabularyEntry,
} from './tagging.types.ts';

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
      .map((entry): TaggingPrediction => ({
        confidence: 0.5,
        dimension: entry.dimension,
        tag: entry.tag,
      }));
    return Promise.resolve(predictions);
  }
}
