import { describe, expect, test } from 'vitest';

import { applyLexicon } from '../lexicon.ts';
import type { SentenceSpan } from '../map-words.ts';
import {
  assertSpansCoverTake,
  FRAME_SECONDS,
  mapWordsToSentences,
  normalizeForMatch,
} from '../map-words.ts';
import type { WordTiming } from '../types.ts';

/** Words on the 80 ms grid, `gap` seconds apart (0 = contiguous). */
const timed = (texts: readonly string[], gap = 0): WordTiming[] => {
  let cursor = 0;

  return texts.map((text) => {
    const word = { endSeconds: cursor + 0.4, startSeconds: cursor, text };

    cursor += 0.4 + gap;

    return word;
  });
};

const sentences = (...spoken: string[]): { spoken: string }[] => {
  return spoken.map((text) => ({ spoken: text }));
};

const spansOf = (
  result: ReturnType<typeof mapWordsToSentences>,
): readonly SentenceSpan[] => {
  if (!result.ok) {
    throw new Error(result.failure.message);
  }

  return result.spans;
};

describe('normalizeForMatch', () => {
  test('drops case, punctuation, spaces and dashes', () => {
    expect(normalizeForMatch('M C P — "Go", now.')).toBe('mcpgonow');
  });
});

describe('mapWordsToSentences', () => {
  test('maps words to sentences and records first and last word', () => {
    const words = timed(['Hello', 'there', 'Open', 'Throttle']);
    const spans = spansOf(
      mapWordsToSentences(
        sentences('Hello there.', 'Open Throttle.'),
        words,
        1.6,
      ),
    );

    expect(spans.map((span) => span.firstWordIndex)).toEqual([0, 2]);
    expect(spans.map((span) => span.lastWordIndex)).toEqual([1, 3]);
  });

  describe('initialisms from the lexicon', () => {
    const spoken = applyLexicon('Connect the MCP server.');

    test('M C P returned as one word', () => {
      const words = timed(['Connect', 'the', 'MCP', 'server']);
      const spans = spansOf(mapWordsToSentences(sentences(spoken), words, 1.6));

      expect(spans[0]?.lastWordIndex).toBe(3);
    });

    test('M C P returned as three words', () => {
      const words = timed(['Connect', 'the', 'M', 'C', 'P', 'server']);
      const spans = spansOf(mapWordsToSentences(sentences(spoken), words, 2.4));

      expect(spans[0]?.lastWordIndex).toBe(5);
    });

    test('a joined initialism does not shift the next sentence', () => {
      const words = timed(['Use', 'MCP', 'Go', 'now']);
      const spans = spansOf(
        mapWordsToSentences(sentences('Use M C P.', 'Go now.'), words, 1.6),
      );

      expect(spans.map((span) => span.firstWordIndex)).toEqual([0, 2]);
    });
  });

  test('matches numbers', () => {
    const spans = spansOf(
      mapWordsToSentences(
        sentences('It costs 3.5 dollars.', 'Port 6010 is free.'),
        timed(['It', 'costs', '35', 'dollars', 'Port', '6010', 'is', 'free']),
        3.2,
      ),
    );

    expect(spans.map((span) => span.lastWordIndex)).toEqual([3, 7]);
  });

  test('matches a sentence whose words are split differently than submitted', () => {
    const spans = spansOf(
      mapWordsToSentences(
        sentences('Run pgvector locally.', 'Done.'),
        timed(['Run', 'pg', 'vector', 'local', 'ly', 'Done']),
        2.4,
      ),
    );

    expect(spans.map((span) => span.lastWordIndex)).toEqual([4, 5]);
  });

  describe('cut points', () => {
    test('cuts at the gap midpoint when there is a measurable gap', () => {
      const words = timed(['One', 'Two'], 0.2);
      const spans = spansOf(
        mapWordsToSentences(sentences('One.', 'Two.'), words, 1.0),
      );

      // One ends 0.4, Two starts 0.6.
      expect(spans[0]?.endSeconds).toBeCloseTo(0.5);
      expect(spans[1]?.startSeconds).toBeCloseTo(0.5);
    });

    test('cuts at the next word start when words are contiguous', () => {
      const words = timed(['One', 'Two']);
      const spans = spansOf(
        mapWordsToSentences(sentences('One.', 'Two.'), words, 0.8),
      );

      expect(spans[0]?.endSeconds).toBeCloseTo(0.4);
      expect(spans[1]?.startSeconds).toBeCloseTo(0.4);
    });

    test('first segment starts at 0 and the last ends at the take duration', () => {
      const words = timed(['One', 'Two', 'Three'], 0.1);
      const spans = spansOf(
        mapWordsToSentences(sentences('One.', 'Two.', 'Three.'), words, 2.0),
      );

      expect(spans[0]?.startSeconds).toBe(0);
      expect(spans.at(-1)?.endSeconds).toBe(2.0);
    });

    test('durations sum to the take duration', () => {
      const words = timed(['One', 'Two', 'Three'], 0.1);
      const spans = spansOf(
        mapWordsToSentences(sentences('One.', 'Two.', 'Three.'), words, 2.0),
      );

      expect(() => {
        assertSpansCoverTake(spans, 2.0);
      }).not.toThrow();
      expect(() => {
        assertSpansCoverTake(spans, 2.0 + FRAME_SECONDS * 2);
      }).toThrow(/segments sum to/);
    });
  });

  describe('desync', () => {
    test('fails with the sentence index and the unmatched words', () => {
      const result = mapWordsToSentences(
        sentences('Hello there.', 'Open Throttle.'),
        timed(['Hello', 'there', 'Open', 'Thrust']),
        1.6,
      );

      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.failure.sentenceIndex).toBe(1);
        expect(result.failure.unmatchedWords).toEqual(['Open', 'Thrust']);
        expect(result.failure.message).toMatch(/sentence 1 expected/);
      }
    });

    test('fails when the stream ends inside a sentence', () => {
      const result = mapWordsToSentences(
        sentences('Hello there.', 'Open Throttle.'),
        timed(['Hello', 'there', 'Open']),
        1.2,
      );

      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.failure.sentenceIndex).toBe(1);
        expect(result.failure.message).toMatch(/ended inside sentence 1/);
      }
    });

    test('fails on words left over after the last sentence', () => {
      const result = mapWordsToSentences(
        sentences('Hello.'),
        timed(['Hello', 'extra']),
        0.8,
      );

      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.failure.unmatchedWords).toEqual(['extra']);
      }
    });

    test('fails on a sentence with no spoken characters', () => {
      const result = mapWordsToSentences(sentences('—'), timed(['x']), 0.4);

      expect(result.ok).toBe(false);
    });
  });
});
