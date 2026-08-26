/**
 * @description Parity with the format being replaced.
 *
 * The migration converts 24 markdown scripts by hand. If the word counting or
 * the sentence splitting shifts even slightly in the process, every budget check
 * moves and every audio segment boundary moves with it — silently, because the
 * only thing that would have noticed was the validator that is being deleted.
 *
 * So the fixture here is real: episode 05's narration, transcribed verbatim from
 * `docs/marketing/scripts/05-connect-ot-mcp.md`, asserted against the number that
 * file's own front matter carries and that `validate-video-scripts.ts` prints
 * today — 99 words.
 */

import { describe, expect, test } from 'vitest';

import {
  budgetWords,
  estimatedSpokenSeconds,
  sentences,
  spokenWords,
  WORDS_PER_MINUTE,
} from '../derived';
import type { Variant } from '../types';

/**
 * Episode 05's shipping narration, cue for cue. The times are the beat times the
 * markdown table carries; under the typed format they are the variant's own.
 */
const CONNECT_OT_MCP: Variant = {
  id: 'payoff-first',
  narration: [
    [
      '0:00',
      'In sixty seconds your agent will be filing plans into OpenThrottle — plans it can actually run.',
    ],
    [
      '0:09',
      "Grab the line for your agent — for us today, that's Claude Code.",
    ],
    [
      '0:15',
      "Run it once and you're covered everywhere — every project, every worktree, every terminal on this machine.",
    ],
    [
      '0:24',
      'One quick restart, the banner confirms the connection, and setup is completely behind you.',
    ],
    [
      '0:31',
      'Now work like you normally would — ask your agent to plan out the next feature.',
    ],
    ['0:39', "Plans and tasks, written straight into OpenThrottle's database."],
    [
      '0:44',
      "And in the dashboard it's more than a document — tasks that run in parallel, with every run tracked.",
    ],
  ],
  thesis:
    'Payoff first. Promises the outcome up front and closes on what you do with the plan next.',
};

describe('spokenWords', () => {
  test('reproduces the count validate-video-scripts.ts prints for episode 05', () => {
    expect(spokenWords(CONNECT_OT_MCP)).toBe(99);
  });

  test('does not count punctuation-only tokens as words', () => {
    const variant: Variant = {
      id: 'punctuation',
      narration: [
        ['0:00', 'Two real words'],
        ['0:05', '— … —'],
      ],
      thesis: 'fixture',
    };

    expect(spokenWords(variant)).toBe(3);
  });

  test('a silent variant counts zero rather than throwing', () => {
    expect(
      spokenWords({ id: 'silent', narration: [], thesis: 'fixture' }),
    ).toBe(0);
  });
});

describe('estimatedSpokenSeconds', () => {
  test('matches the ~41s the validator prints for episode 05', () => {
    expect(estimatedSpokenSeconds(CONNECT_OT_MCP)).toBe(41);
  });

  test('is the word count over the documented pace', () => {
    expect(estimatedSpokenSeconds(CONNECT_OT_MCP)).toBe(
      Math.round((99 / WORDS_PER_MINUTE) * 60),
    );
  });
});

describe('budgetWords', () => {
  test('a short budgets 132 words — 55 seconds at 145 wpm, not 60', () => {
    expect(budgetWords('short')).toBe(132);
  });

  test('long-form budgets 1740 words', () => {
    expect(budgetWords('longform')).toBe(1740);
  });

  test('episode 05 sits under the short budget', () => {
    expect(spokenWords(CONNECT_OT_MCP)).toBeLessThan(budgetWords('short'));
  });
});

describe('sentences', () => {
  test('splits a multi-sentence cue and keeps the cue time on each', () => {
    const variant: Variant = {
      id: 'two-sentences',
      narration: [
        ['0:00', 'A plan is where the work lives. Tasks hang off it.'],
      ],
      thesis: 'fixture',
    };
    const result = sentences(variant);

    expect(result).toHaveLength(2);
    expect(result[0]?.written).toBe('A plan is where the work lives.');
    expect(result[1]?.written).toBe('Tasks hang off it.');
    expect(result.every((sentence) => sentence.beat === '0:00')).toBe(true);
  });

  test('indexes continuously across cues, not per cue', () => {
    const result = sentences(CONNECT_OT_MCP);

    expect(result.map((sentence) => sentence.index)).toEqual(
      result.map((_, position) => position),
    );
  });

  test('does not split on an em dash, which narration uses constantly', () => {
    const variant: Variant = {
      id: 'em-dash',
      narration: [
        ['0:00', 'Grab the line — for us today, that is Claude Code.'],
      ],
      thesis: 'fixture',
    };

    expect(sentences(variant)).toHaveLength(1);
  });

  test('applies the pronunciation lexicon to spoken, leaving written alone', () => {
    // written feeds the captions, spoken feeds the TTS. "OpenThrottle" read as
    // one word comes out wrong, so the lexicon splits it — and the caption must
    // not inherit that split.
    const result = sentences(CONNECT_OT_MCP);
    const sentence = result.find((candidate) =>
      candidate.written.includes('OpenThrottle'),
    );

    expect(sentence).toBeDefined();
    expect(sentence?.written).toContain('OpenThrottle');
    expect(sentence?.written).not.toContain('Open Throttle');
    expect(sentence?.spoken).toContain('Open Throttle');
    expect(sentence?.spoken).not.toBe(sentence?.written);
  });

  test('a silent variant yields no sentences', () => {
    expect(
      sentences({ id: 'silent', narration: [], thesis: 'fixture' }),
    ).toEqual([]);
  });
});
