import type {
  TaggingModelProvider,
  TaggingPrediction,
} from './tagging.types.ts';

export class DisabledTaggingModelProvider implements TaggingModelProvider {
  readonly name = 'disabled';

  classify(): Promise<TaggingPrediction[]> {
    return Promise.resolve([]);
  }
}
