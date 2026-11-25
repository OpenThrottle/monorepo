/**
 * @description Pure helpers for Fish Audio's `/v1/tts/stream/with-timestamp`
 * response: SSE framing, per-event JSON, whole-take audio assembly, word timing
 * offsets, WAV framing and coverage reconciliation. No network, no filesystem, so
 * every one of them is testable against a checked-in fixture.
 *
 * What a measurement spike established about the stream (see src/scripts/fish-whole-take.ts):
 * - every event is `event: message` with JSON `data`; there is no done event, and
 *   the stream ends with an event whose `audio_base64` is `''`;
 * - only the very first audio carries a WAV header (placeholder data size); the rest
 *   is raw s16le mono PCM;
 * - alignment is CUMULATIVE within a `chunk_seq`, so only a seq's last event counts;
 * - absolute word time = `chunk_audio_offset_sec` + the chunk-relative time;
 * - a chunk's last event already carries about 0.8 s of the NEXT chunk's audio, so
 *   audio is concatenated in arrival order and never split by `chunk_seq`.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import { normalizeForMatch } from '../map-words.ts';
import type { WordTiming } from '../types.ts';

/** One SSE event: its `event:` name and its `data:` lines joined with a newline. */
export interface SseEvent {
  readonly data: string;
  readonly event: string | undefined;
}

export interface SseParseState {
  readonly events: readonly SseEvent[];
  /** Text after the last complete event: a partial line or partial event. */
  readonly rest: string;
}

/** One parsed `data` payload of the stream. */
export interface TakeEvent {
  readonly audio: Buffer;
  readonly chunkOffsetSeconds: number;
  readonly chunkSeq: number;
  /** Chunk-relative words; `undefined` when the event's alignment is null. */
  readonly words: readonly WordTiming[] | undefined;
}

export interface AssembledTake {
  /** Raw s16le mono PCM, all events concatenated in arrival order. */
  readonly pcm: Buffer;
  /** Absolute to the take. */
  readonly words: readonly WordTiming[];
}

export const FISH_TAKE_SAMPLE_RATE = 44_100;

const readField = (record: Record<string, unknown>, key: string): unknown => {
  return Object.hasOwn(record, key) ? record[key] : undefined;
};

const parseBlock = (block: string): SseEvent | undefined => {
  const dataLines: string[] = [];
  let event: string | undefined;

  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith(':')) {
      continue;
    }

    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    const raw = separator === -1 ? '' : line.slice(separator + 1);
    const value = raw.startsWith(' ') ? raw.slice(1) : raw;

    if (field === 'data') {
      dataLines.push(value);
    } else if (field === 'event') {
      event = value;
    }
  }

  return dataLines.length === 0
    ? undefined
    : { data: dataLines.join('\n'), event };
};

/**
 * @description Feed the next decoded text read into the parser. Events end at a
 * blank line; anything after the last blank line (including half a line split by a
 * network read) is returned as `rest` to be passed back in with the next read.
 */
export const parseSseText = (rest: string, incoming: string): SseParseState => {
  const blocks = `${rest}${incoming}`.split(/\r?\n\r?\n/);
  const remainder = blocks.pop() ?? '';
  const events: SseEvent[] = [];

  for (const block of blocks) {
    const event = parseBlock(block);

    if (event !== undefined) {
      events.push(event);
    }
  }

  return { events, rest: remainder };
};

/** @description Flush the final `rest` when the stream closes without a blank line. */
export const flushSseText = (rest: string): readonly SseEvent[] => {
  const event = parseBlock(rest);

  return event === undefined ? [] : [event];
};

const readWords = (alignment: unknown): readonly WordTiming[] | undefined => {
  if (!isRecord(alignment)) {
    return undefined;
  }

  const segments = readField(alignment, 'segments');

  if (!Array.isArray(segments)) {
    return undefined;
  }

  const words: WordTiming[] = [];

  for (const segment of segments) {
    if (!isRecord(segment)) {
      throw new TypeError(`fish-audio: alignment segment is not an object`);
    }

    const text = readField(segment, 'text');
    const start = readField(segment, 'start');
    const end = readField(segment, 'end');

    if (
      typeof text !== 'string' ||
      typeof start !== 'number' ||
      typeof end !== 'number'
    ) {
      throw new TypeError(
        `fish-audio: alignment segment needs text, start and end`,
      );
    }

    words.push({ endSeconds: end, startSeconds: start, text });
  }

  return words;
};

/** @description Parse one event's JSON `data`. Throws on a malformed event. */
export const parseTakeEvent = (data: string): TakeEvent => {
  const parsed: unknown = JSON.parse(data);

  if (!isRecord(parsed)) {
    throw new TypeError(`fish-audio: stream event is not a JSON object`);
  }

  const audio = readField(parsed, 'audio_base64');
  const offset = readField(parsed, 'chunk_audio_offset_sec');
  const seq = readField(parsed, 'chunk_seq');

  if (typeof audio !== 'string') {
    throw new TypeError(`fish-audio: stream event has no audio_base64 string`);
  }

  return {
    audio: Buffer.from(audio, 'base64'),
    chunkOffsetSeconds: typeof offset === 'number' ? offset : 0,
    chunkSeq: typeof seq === 'number' ? seq : 0,
    words: readWords(readField(parsed, 'alignment')),
  };
};

/**
 * @description Strip a leading WAV header, returning the PCM after the `data`
 * chunk's 8-byte header. Streamed WAVs carry a placeholder data size, so the size
 * is ignored. Audio without a RIFF header is returned unchanged.
 */
export const stripWavHeader = (audio: Buffer): Buffer => {
  if (audio.length < 12 || audio.toString('ascii', 0, 4) !== 'RIFF') {
    return audio;
  }

  let offset = 12;

  while (offset + 8 <= audio.length) {
    const id = audio.toString('ascii', offset, offset + 4);
    const size = audio.readUInt32LE(offset + 4);

    if (id === 'fmt ') {
      const rate = audio.readUInt32LE(offset + 12);

      if (rate !== FISH_TAKE_SAMPLE_RATE) {
        throw new Error(
          `fish-audio: stream WAV is ${String(rate)} Hz, expected ${String(FISH_TAKE_SAMPLE_RATE)}`,
        );
      }
    }

    if (id === 'data') {
      return audio.subarray(offset + 8);
    }

    offset += 8 + size + (size % 2);
  }

  throw new Error(`fish-audio: stream WAV header has no data chunk`);
};

/**
 * @description Build one proper WAV: a correct header (mono, s16le) over `pcm`.
 */
export const buildWav = (pcm: Buffer, sampleRate: number): Buffer => {
  const header = Buffer.alloc(44);

  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
};

/**
 * @description Concatenate every event's audio in arrival order (header stripped
 * from the first non-empty audio only) and build absolute word timings from each
 * `chunk_seq`'s LAST alignment. Throws when no event carried an alignment.
 */
export const assembleTake = (events: readonly TakeEvent[]): AssembledTake => {
  const pieces: Buffer[] = [];
  const lastBySeq = new Map<number, TakeEvent>();
  let sawAudio = false;

  for (const event of events) {
    if (event.audio.length > 0) {
      pieces.push(sawAudio ? event.audio : stripWavHeader(event.audio));
      sawAudio = true;
    }

    if (event.words !== undefined) {
      lastBySeq.set(event.chunkSeq, event);
    }
  }

  if (events.length > 0 && lastBySeq.size === 0) {
    throw new Error(
      `fish-audio: every stream event had alignment null, so there are no word timings`,
    );
  }

  const words: WordTiming[] = [];

  for (const [, event] of [...lastBySeq].sort(([a], [b]) => a - b)) {
    for (const word of event.words ?? []) {
      words.push({
        endSeconds: event.chunkOffsetSeconds + word.endSeconds,
        startSeconds: event.chunkOffsetSeconds + word.startSeconds,
        text: word.text,
      });
    }
  }

  return { pcm: Buffer.concat(pieces), words };
};

/**
 * @description The submitted text's whitespace tokens that Fish times: tokens with
 * no letter or digit (an em dash) get no alignment entry, so they are excluded.
 */
export const spokenTokens = (text: string): readonly string[] => {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token));
};

/**
 * @description Fail loudly when the aligned words do not cover the submitted text,
 * i.e. the stream ended early. Reconciles on normalised CHARACTERS, not token
 * counts, so a token the service returns joined or split (`M C P` as `MCP`) is not
 * mistaken for a short stream. Per-sentence placement is `mapWordsToSentences`.
 */
export const assertCoverage = (
  text: string,
  words: readonly WordTiming[],
): void => {
  const expected = normalizeForMatch(spokenTokens(text).join(' '));
  const received = normalizeForMatch(words.map((word) => word.text).join(' '));

  if (expected !== received) {
    throw new Error(
      `fish-audio: whole-take stream aligned ${String(received.length)} of ${String(expected.length)} spoken characters across ${String(words.length)} words (the stream ended early or alignment differs); refusing to slice`,
    );
  }
};
