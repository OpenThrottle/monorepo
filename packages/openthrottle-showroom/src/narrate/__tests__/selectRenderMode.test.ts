import { describe, expect, test } from 'vitest';

import { selectRenderMode } from '../selectRenderMode.ts';
import type { TtsBackend } from '../types.ts';
import { RENDER_MODE } from '../types.ts';

const perSentenceOnly: TtsBackend = {
  id: 'fake-per-sentence',
  render: (request) => Promise.resolve(request.outputPath),
  sendsDataOffBox: false,
};

const withTake: TtsBackend = {
  id: 'fake-whole-take',
  render: (request) => Promise.resolve(request.outputPath),
  renderTake: (request) =>
    Promise.resolve({ audioPath: request.outputPath, words: [] }),
  sendsDataOffBox: true,
};

describe('selectRenderMode', () => {
  describe('a backend without renderTake', () => {
    test('uses the per-sentence path', () => {
      expect(
        selectRenderMode({ backend: perSentenceOnly, perSentence: false }),
      ).toBe(RENDER_MODE.PER_SENTENCE);
    });

    test('stays per-sentence when the flag is passed too', () => {
      expect(
        selectRenderMode({ backend: perSentenceOnly, perSentence: true }),
      ).toBe(RENDER_MODE.PER_SENTENCE);
    });
  });

  describe('a backend offering renderTake', () => {
    test('uses whole-take by default', () => {
      expect(selectRenderMode({ backend: withTake, perSentence: false })).toBe(
        RENDER_MODE.WHOLE_TAKE,
      );
    });

    test('--per-sentence forces the per-sentence path', () => {
      expect(selectRenderMode({ backend: withTake, perSentence: true })).toBe(
        RENDER_MODE.PER_SENTENCE,
      );
    });
  });
});
