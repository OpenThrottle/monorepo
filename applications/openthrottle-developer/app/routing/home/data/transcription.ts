import type { TranscriptionSnapshot } from '~/routing/home/types';

export const INITIAL_TRANSCRIPTION_SNAPSHOT: TranscriptionSnapshot = {
  done: false,
  error: null,
  sortOrder: -1,
  transcript: '',
};
