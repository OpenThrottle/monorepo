import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import type { WordTiming } from '../../types.ts';
import type { SseEvent } from '../fish-audio-sse.ts';
import {
  assembleTake,
  assertCoverage,
  buildWav,
  FISH_TAKE_SAMPLE_RATE,
  flushSseText,
  parseSseText,
  parseTakeEvent,
  spokenTokens,
  stripWavHeader,
} from '../fish-audio-sse.ts';

/**
 * Tiny synthetic take: two chunk_seqs (the second offset 0.8 s), cumulative
 * alignment, a 44-byte WAV header on the first event only, 8 bytes of PCM per
 * event filled with the event's ordinal (1..5), and a closing empty-audio event
 * with alignment null. The text it covers is `TEXT`.
 */
const FIXTURE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fish-take.sse'),
  'utf8',
);

const TEXT = 'Hello there. Open Throttle — local first.';

const parseAll = (text: string): SseEvent[] => {
  const parsed = parseSseText('', text);

  return [...parsed.events, ...flushSseText(parsed.rest)];
};

const takeFromFixture = (): ReturnType<typeof assembleTake> => {
  return assembleTake(
    parseAll(FIXTURE).map((event) => parseTakeEvent(event.data)),
  );
};

describe('parseSseText', () => {
  test('parses every event of the fixture', () => {
    const events = parseAll(FIXTURE);

    expect(events).toHaveLength(6);
    expect(events.every((event) => event.event === 'message')).toBe(true);
  });

  test('buffers a partial line split across reads', () => {
    for (const cut of [1, 7, 30, 101, FIXTURE.length - 3]) {
      const first = parseSseText('', FIXTURE.slice(0, cut));
      const second = parseSseText(first.rest, FIXTURE.slice(cut));
      const events = [
        ...first.events,
        ...second.events,
        ...flushSseText(second.rest),
      ];

      expect(events).toEqual(parseAll(FIXTURE));
    }
  });

  test('handles CRLF framing', () => {
    expect(parseAll(FIXTURE.replaceAll('\n', '\r\n'))).toEqual(
      parseAll(FIXTURE),
    );
  });

  test('joins multiple data lines of one event and skips comments', () => {
    const events = parseAll(
      ': keepalive\nevent: message\ndata: a\ndata: b\n\n',
    );

    expect(events).toEqual([{ data: 'a\nb', event: 'message' }]);
  });

  test('holds an unterminated event until flushed', () => {
    const parsed = parseSseText('', 'data: {"x":1}');

    expect(parsed.events).toHaveLength(0);
    expect(flushSseText(parsed.rest)).toEqual([
      { data: '{"x":1}', event: undefined },
    ]);
  });
});

describe('assembleTake', () => {
  test('concatenates all audio in arrival order, header stripped once', () => {
    const { pcm } = takeFromFixture();

    expect(pcm.length).toBe(5 * 8);
    expect([...pcm]).toEqual(
      [1, 2, 3, 4, 5].flatMap((value) =>
        Array.from({ length: 8 }, () => value),
      ),
    );
  });

  test('offsets each seq last alignment to absolute take time', () => {
    const { words } = takeFromFixture();

    expect(words.map((word) => word.text)).toEqual([
      'Hello',
      'there',
      'Open',
      'Throttle',
      'local',
      'first',
    ]);

    const starts = words.map((word) => word.startSeconds);
    const ends = words.map((word) => word.endSeconds);

    for (const [index, expected] of [0, 0.4, 0.8, 1.2, 1.6, 2].entries()) {
      expect(starts[index]).toBeCloseTo(expected);
    }
    expect(ends.at(-1)).toBeCloseTo(2.4);
  });

  test('fails loudly when every event has alignment null', () => {
    const event = parseTakeEvent(
      JSON.stringify({
        alignment: null,
        audio_base64: '',
        chunk_audio_offset_sec: 0,
        chunk_seq: 0,
      }),
    );

    expect(() => assembleTake([event])).toThrow(/alignment null/);
  });
});

describe('stripWavHeader and buildWav', () => {
  test('buildWav writes a correct mono s16le header', () => {
    const wav = buildWav(Buffer.alloc(10, 9), FISH_TAKE_SAMPLE_RATE);

    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.readUInt32LE(4)).toBe(36 + 10);
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(FISH_TAKE_SAMPLE_RATE);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.readUInt32LE(40)).toBe(10);
    expect(wav.length).toBe(54);
  });

  test('stripWavHeader round-trips buildWav', () => {
    const pcm = Buffer.alloc(10, 9);

    expect(stripWavHeader(buildWav(pcm, FISH_TAKE_SAMPLE_RATE))).toEqual(pcm);
  });

  test('stripWavHeader leaves headerless audio alone', () => {
    const pcm = Buffer.alloc(20, 3);

    expect(stripWavHeader(pcm)).toBe(pcm);
  });

  test('stripWavHeader rejects an unexpected sample rate', () => {
    expect(() => stripWavHeader(buildWav(Buffer.alloc(4), 48_000))).toThrow(
      /48000 Hz/,
    );
  });
});

describe('coverage', () => {
  test('spokenTokens drops pure-punctuation tokens', () => {
    expect(spokenTokens(TEXT)).toHaveLength(6);
  });

  test('passes when the aligned words cover the text', () => {
    expect(() => {
      assertCoverage(TEXT, takeFromFixture().words);
    }).not.toThrow();
  });

  test('fails loudly when the stream ended early', () => {
    expect(() => {
      assertCoverage(TEXT, takeFromFixture().words.slice(0, 4));
    }).toThrow(/aligned 22 of 32 spoken characters across 4 words/);
  });

  test('accepts tokens returned joined or split', () => {
    const word = (text: string): WordTiming => {
      return { endSeconds: 1, startSeconds: 0, text };
    };

    expect(() => {
      assertCoverage('Use M C P now', [word('Use'), word('MCP'), word('now')]);
    }).not.toThrow();
    expect(() => {
      assertCoverage('Use MCP now', [
        word('Use'),
        word('M'),
        word('C'),
        word('P'),
        word('now'),
      ]);
    }).not.toThrow();
  });
});
