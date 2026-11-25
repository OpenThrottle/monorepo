#!/usr/bin/env node

/**
 * @description Measurement script — nothing imports it. Baselines a Fish Audio
 * whole-take read (POST /v1/tts/stream/with-timestamp, one request for the whole
 * script) against today's per-sentence path, and sweeps `chunk_length`.
 *
 *   pnpm exec tsx --env-file <primary>/.env src/scripts/fish-whole-take.ts
 *
 * Every hosted response is cached under output/fish-whole-take/raw/ (the package's
 * gitignored output/), so a
 * re-run re-analyses without re-buying a render. `--offline` refuses any request.
 *
 * Input: episode 05-connect-ot-mcp, selected variant, lexicon applied (the
 * `spoken` text from parseScript). Only published-episode narration is sent.
 */

import { execFile } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  DEFAULT_FISH_AUDIO_VOICE,
  fishAudioBackend,
  resolveFishAudioApiKey,
  resolveFishAudioModel,
} from '../narrate/backends/fish-audio.ts';
import { parseScript } from '../narrate/parseScript.ts';
import { loadFormat } from '../runner/format.ts';

const execFileAsync = promisify(execFile);

const SLUG = '05-connect-ot-mcp';
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../output',
  'fish-whole-take',
);
const RAW = join(OUT, 'raw');
const OFFLINE = process.argv.includes('--offline');

/** Highest wav rate Fish accepts (observed 400 at 48000). */
const WAV_MAX_SAMPLE_RATE = 44_100;

let hostedRequests = 0;

interface Word {
  readonly end: number;
  readonly start: number;
  readonly text: string;
}

/** One text chunk (`chunk_seq`): all of its events' audio, and its final alignment. */
interface Chunk {
  readonly content: string;
  /** `chunk_audio_offset_sec`: where this chunk's audio starts in the take. */
  readonly offset: number;
  readonly pcm: Buffer;
  /** `alignment.audio_duration` from the chunk's last event. */
  readonly reportedDuration: number;
  readonly seq: number;
  /** Chunk-relative word times. */
  readonly words: readonly Word[];
}

interface Take {
  readonly chunks: readonly Chunk[];
  readonly eventSummary: readonly string[];
  readonly sampleRate: number;
}

// ---------- WAV helpers ----------

const parseWav = (buffer: Buffer): { pcm: Buffer; sampleRate: number } => {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') {
    return { pcm: buffer, sampleRate: 0 };
  }

  let offset = 12;
  let sampleRate = 0;

  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    let size = buffer.readUInt32LE(offset + 4);

    if (id === 'fmt ') {
      sampleRate = buffer.readUInt32LE(offset + 12);
    }

    if (id === 'data') {
      // Streamed WAVs often carry a placeholder size; take the rest of the buffer.
      if (
        size === 0 ||
        size === 0xff_ff_ff_ff ||
        offset + 8 + size > buffer.length
      ) {
        size = buffer.length - offset - 8;
      }

      return {
        pcm: buffer.subarray(offset + 8, offset + 8 + size),
        sampleRate,
      };
    }

    offset += 8 + size + (size % 2);
  }

  throw new Error('wav: no data chunk');
};

const writeWav = (path: string, pcm: Buffer, sampleRate: number): void => {
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
  writeFileSync(path, Buffer.concat([header, pcm]));
};

// ---------- ffmpeg ----------

const ffmpeg = async (args: readonly string[]): Promise<string> => {
  const { stderr } = await execFileAsync(
    'ffmpeg',
    ['-hide_banner', '-nostdin', ...args],
    { maxBuffer: 64 * 1024 * 1024 },
  );

  return stderr;
};

/** Same two-pass loudnorm as narrate.ts: measure the whole take once, apply one gain. */
const normalise = async (input: string, output: string): Promise<void> => {
  const format = loadFormat();
  const { targetLufs, truePeakDb, sampleRate } = format.audio;
  const measure = await ffmpeg([
    '-i',
    input,
    '-af',
    `loudnorm=I=${String(targetLufs)}:TP=${String(truePeakDb)}:LRA=11:print_format=json`,
    '-f',
    'null',
    '-',
  ]);
  const parsed: unknown = JSON.parse(
    measure.slice(measure.lastIndexOf('{'), measure.lastIndexOf('}') + 1),
  );
  const read = (key: string): string => {
    const isObject = typeof parsed === 'object' && parsed !== null;
    const value = isObject ? Reflect.get(parsed, key) : undefined;

    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : '0';
  };
  const filter = [
    `loudnorm=I=${String(targetLufs)}`,
    `TP=${String(truePeakDb)}`,
    'LRA=11',
    `measured_I=${read('input_i')}`,
    `measured_TP=${read('input_tp')}`,
    `measured_LRA=${read('input_lra')}`,
    `measured_thresh=${read('input_thresh')}`,
    `offset=${read('target_offset')}`,
    'linear=true',
  ].join(':');

  await ffmpeg([
    '-loglevel',
    'error',
    '-y',
    '-i',
    input,
    '-af',
    filter,
    '-ar',
    String(sampleRate),
    '-c:a',
    'pcm_s16le',
    output,
  ]);
};

interface Measurement {
  readonly durationSeconds: number;
  readonly integratedLufs: number;
  readonly lra: number;
  readonly truePeakDb: number;
}

const measure = async (path: string): Promise<Measurement> => {
  const stderr = await ffmpeg([
    '-i',
    path,
    '-af',
    'ebur128=peak=true',
    '-f',
    'null',
    '-',
  ]);
  const summary = stderr.slice(stderr.lastIndexOf('Summary:'));
  const grab = (pattern: RegExp): number => {
    return Number.parseFloat(pattern.exec(summary)?.[1] ?? 'NaN');
  };
  const { stdout } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=nw=1:nk=1',
    path,
  ]);

  return {
    durationSeconds: Number.parseFloat(stdout.trim()),
    integratedLufs: grab(/I:\s+(-?[\d.]+) LUFS/),
    lra: grab(/LRA:\s+(-?[\d.]+) LU/),
    truePeakDb: grab(/Peak:\s+(-?[\d.]+) dBFS/),
  };
};

// ---------- hosted calls (cached) ----------

const cached = async (
  name: string,
  fetcher: () => Promise<Buffer>,
): Promise<Buffer> => {
  const path = join(RAW, name);

  if (existsSync(path)) {
    return readFileSync(path);
  }

  if (OFFLINE) {
    throw new Error(`--offline and no cached response for ${name}`);
  }

  hostedRequests += 1;
  const body = await fetcher();
  writeFileSync(path, body);

  return body;
};

const fetchWholeTake = async (
  text: string,
  chunkLength: number | undefined,
): Promise<Buffer> => {
  const format = loadFormat();
  const body: Record<string, unknown> = {
    format: 'wav',
    reference_id: DEFAULT_FISH_AUDIO_VOICE,
    // format.json wants 48000, but the service rejects it for wav (400: "Supported
    // sample rates: 8000, 16000, 24000, 32000, 44100"). Request 44100 — what the
    // per-sentence path already returns natively — and resample locally like narrate.ts.
    sample_rate: Math.min(format.audio.sampleRate, WAV_MAX_SAMPLE_RATE),
    text,
  };

  if (chunkLength !== undefined) {
    body.chunk_length = chunkLength;
  }

  const response = await fetch(
    'https://api.fish.audio/v1/tts/stream/with-timestamp',
    {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${resolveFishAudioApiKey()}`,
        'Content-Type': 'application/json',
        model: resolveFishAudioModel(),
      },
      method: 'POST',
    },
  );
  const headerDump = [...response.headers.entries()]
    .filter(([key]) => !/cookie|auth/i.test(key))
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  const bytes = Buffer.from(await response.arrayBuffer());

  writeFileSync(
    join(RAW, `whole-${String(chunkLength ?? 'default')}.meta.txt`),
    `status: ${String(response.status)}\nrequest: ${JSON.stringify({ ...body, text: `<${String(text.length)} chars>` })}\n${headerDump}\n`,
  );

  if (!response.ok) {
    throw new Error(
      `with-timestamp failed (${String(response.status)}): ${bytes.toString('utf8').slice(0, 500)}`,
    );
  }

  return bytes;
};

// ---------- SSE parsing ----------

const asNumber = (value: unknown): number | undefined => {
  return typeof value === 'number' ? value : undefined;
};

const describe = (value: unknown, depth = 0): string => {
  if (Array.isArray(value)) {
    return `[${String(value.length)}× ${value.length > 0 ? describe(value[0], depth + 1) : '?'}]`;
  }

  if (typeof value === 'object' && value !== null) {
    return `{${Object.entries(value)
      .map(
        ([key, inner]) =>
          `${key}: ${depth > 3 ? typeof inner : describe(inner, depth + 1)}`,
      )
      .join(', ')}}`;
  }

  return typeof value === 'string' && value.length > 40
    ? `string(${String(value.length)})`
    : JSON.stringify(value);
};

const extractWords = (alignment: unknown): Word[] => {
  if (typeof alignment !== 'object' || alignment === null) {
    return [];
  }

  const segments: unknown = Reflect.get(alignment, 'segments');

  if (!Array.isArray(segments)) {
    return [];
  }

  return segments.flatMap((segment: unknown) => {
    if (typeof segment !== 'object' || segment === null) {
      return [];
    }

    const text = Reflect.get(segment, 'text');
    const start =
      asNumber(Reflect.get(segment, 'start')) ??
      asNumber(Reflect.get(segment, 'start_sec'));
    const end =
      asNumber(Reflect.get(segment, 'end')) ??
      asNumber(Reflect.get(segment, 'end_sec'));

    return typeof text === 'string' && start !== undefined && end !== undefined
      ? [{ end, start, text }]
      : [];
  });
};

const parseSse = (raw: Buffer): Take => {
  const events = raw
    .toString('utf8')
    .split(/\r?\n\r?\n/)
    .filter((block) => block.trim().length > 0);
  const bySeq = new Map<
    number,
    {
      content: string;
      offset: number;
      pcm: Buffer[];
      words: Word[];
      reportedDuration: number;
    }
  >();
  const eventSummary: string[] = [];
  let sampleRate = 0;

  for (const block of events) {
    const lines = block.split(/\r?\n/);
    const eventName =
      lines
        .find((line) => line.startsWith('event:'))
        ?.slice(6)
        .trim() ?? '(none)';
    const data = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    let parsed: unknown;

    try {
      parsed = JSON.parse(data);
    } catch {
      eventSummary.push(
        `event=${eventName} data(non-json)=${JSON.stringify(data.slice(0, 80))}`,
      );
      continue;
    }

    if (typeof parsed !== 'object' || parsed === null) {
      continue;
    }

    eventSummary.push(`event=${eventName} ${describe(parsed)}`);
    const seq = asNumber(Reflect.get(parsed, 'chunk_seq')) ?? 0;
    const entry = bySeq.get(seq) ?? {
      content: '',
      offset: 0,
      pcm: [],
      reportedDuration: 0,
      words: [],
    };
    const audio: unknown = Reflect.get(parsed, 'audio_base64');

    if (typeof audio === 'string' && audio.length > 0) {
      // Only the very first event of the stream carries a RIFF header; the rest is raw PCM.
      const decoded = parseWav(Buffer.from(audio, 'base64'));
      sampleRate = decoded.sampleRate || sampleRate;
      entry.pcm.push(decoded.pcm);
    }

    const content = Reflect.get(parsed, 'content');
    entry.content = typeof content === 'string' ? content : entry.content;
    entry.offset =
      asNumber(Reflect.get(parsed, 'chunk_audio_offset_sec')) ?? entry.offset;
    const alignment: unknown = Reflect.get(parsed, 'alignment');
    // Alignment is CUMULATIVE within a chunk_seq: each event repeats every word so far.
    entry.words = extractWords(alignment);
    const hasAlignment = typeof alignment === 'object' && alignment !== null;
    const reported = hasAlignment
      ? asNumber(Reflect.get(alignment, 'audio_duration'))
      : undefined;
    entry.reportedDuration = reported ?? 0;
    bySeq.set(seq, entry);
  }

  const chunks = [...bySeq.entries()]
    .sort(([a], [b]) => a - b)
    .map(([seq, entry]) => ({
      content: entry.content,
      offset: entry.offset,
      pcm: Buffer.concat(entry.pcm),
      reportedDuration: entry.reportedDuration,
      seq,
      words: entry.words,
    }));

  return { chunks, eventSummary, sampleRate };
};

// ---------- analysis ----------

const normWord = (word: string): string => {
  return word.toLowerCase().replaceAll(/[^a-z0-9']/g, '');
};

/** Token-level diff of submitted text vs timing entries: reports merges, splits, drops, extras. */
const coverage = (submitted: string, words: readonly Word[]): string[] => {
  const expected = submitted
    .split(/\s+/)
    .map(normWord)
    .filter((w) => w.length > 0);
  const got = words.map((w) => normWord(w.text));
  const notes: string[] = [
    `submitted word tokens (punctuation-only tokens like "—" dropped): ${String(expected.length)}; timing entries: ${String(words.length)}`,
  ];
  let i = 0;
  let j = 0;

  while (i < expected.length && j < got.length) {
    const e = expected[i] ?? '';
    const g = got[j] ?? '';

    if (e === g) {
      i += 1;
      j += 1;
      continue;
    }

    let merged = e;
    let k = i + 1;

    while (k < expected.length && merged.length < g.length) {
      merged += expected[k] ?? '';
      k += 1;
    }

    if (merged === g) {
      notes.push(
        `MERGE: submitted "${expected.slice(i, k).join(' ')}" -> one entry "${words[j]?.text ?? ''}"`,
      );
      i = k;
      j += 1;
      continue;
    }

    let split = g;
    let m = j + 1;

    while (m < got.length && split.length < e.length) {
      split += got[m] ?? '';
      m += 1;
    }

    if (split === e) {
      notes.push(
        `SPLIT: submitted "${e}" -> entries ${words
          .slice(j, m)
          .map((w) => `"${w.text}"`)
          .join(' + ')}`,
      );
      i += 1;
      j = m;
      continue;
    }

    notes.push(
      `MISMATCH: submitted #${String(i)} "${e}" vs entry #${String(j)} "${words[j]?.text ?? ''}"`,
    );
    i += 1;
    j += 1;
  }

  if (i < expected.length) {
    notes.push(`UNCOVERED: "${expected.slice(i).join(' ')}"`);
  }

  if (j < got.length) {
    notes.push(
      `EXTRA: "${words
        .slice(j)
        .map((w) => w.text)
        .join(' ')}"`,
    );
  }

  if (notes.length === 1) {
    notes.push(
      'every submitted word has exactly one timing entry, in order (no merges, splits, drops)',
    );
  }

  return notes;
};

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length === 0) {
    return Number.NaN;
  }

  return sorted.length % 2 === 1
    ? (sorted[mid] ?? 0)
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
};

const ms = (seconds: number): string => {
  return (seconds * 1000).toFixed(0);
};

/** Silence intervals (-45 dB, >= 40 ms) in a file, from ffmpeg silencedetect. */
const silences = async (
  path: string,
): Promise<{ end: number; start: number }[]> => {
  const stderr = await ffmpeg([
    '-i',
    path,
    '-af',
    'silencedetect=n=-45dB:d=0.04',
    '-f',
    'null',
    '-',
  ]);
  const starts = [...stderr.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) =>
    Number(m[1]),
  );
  const ends = [...stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) =>
    Number(m[1]),
  );

  return starts.map((start, n) => ({
    end: ends[n] ?? Number.POSITIVE_INFINITY,
    start,
  }));
};

/** Length of the audible silence spanning time t (0 if t is inside sound). */
const silenceAt = (
  intervals: readonly { end: number; start: number }[],
  t: number,
): number => {
  const hit = intervals.find((s) => s.start <= t + 0.02 && s.end >= t - 0.02);

  return hit ? Math.min(hit.end, 1e6) - Math.max(hit.start, 0) : 0;
};

interface TakeReport {
  readonly absoluteWords: readonly Word[];
  readonly lines: readonly string[];
}

const analyseTake = async (
  label: string,
  take: Take,
  text: string,
  audioPath: string,
): Promise<TakeReport> => {
  const lines: string[] = [
    `## ${label}`,
    `events: ${String(take.eventSummary.length)}; text chunks (chunk_seq): ${String(take.chunks.length)}; sample rate: ${String(take.sampleRate)}`,
  ];
  const absoluteWords: Word[] = [];
  const seamAt: number[] = [];
  // Audio is ONE continuous stream: a chunk's last event already carries the start of
  // the next chunk's audio under the old chunk_seq. So: concatenate every event's
  // audio in order, and place words at chunk_audio_offset_sec + chunk-relative time.
  const decodedTotal =
    take.chunks.reduce((sum, c) => sum + c.pcm.length, 0) /
    2 /
    (take.sampleRate || 44_100);
  const lastChunk = take.chunks.at(-1);
  lines.push(
    `- decoded stream ${decodedTotal.toFixed(3)}s vs last chunk_audio_offset_sec + audio_duration ${((lastChunk?.offset ?? 0) + (lastChunk?.reportedDuration ?? 0)).toFixed(3)}s`,
  );

  for (const chunk of take.chunks) {
    lines.push(
      `- chunk_seq ${String(chunk.seq)}: ${String(chunk.content.length)} chars, chunk_audio_offset_sec ${chunk.offset.toFixed(3)}, audio_duration ${chunk.reportedDuration.toFixed(3)}, ${String(chunk.words.length)} words, first word at +${chunk.words[0]?.start.toFixed(2) ?? '?'}s — "${chunk.content.slice(0, 40)}…${chunk.content.slice(-25)}"`,
    );

    if (absoluteWords.length > 0) {
      seamAt.push(absoluteWords.length);
    }

    for (const word of chunk.words) {
      absoluteWords.push({
        end: word.end + chunk.offset,
        start: word.start + chunk.offset,
        text: word.text,
      });
    }
  }

  // The aligner strips punctuation, so read it off the submitted text (1:1 with entries).
  const rawTokens = text.split(/\s+/);
  const punctuationAfter: string[] = [];

  rawTokens.forEach((token, n) => {
    if (normWord(token).length === 0) {
      return;
    }

    const next = rawTokens[n + 1] ?? '';
    const trailing = /[^a-z0-9']+$/i.exec(token)?.[0] ?? '';
    punctuationAfter.push(
      normWord(next).length === 0 && next.length > 0
        ? `${trailing}${next}`
        : trailing,
    );
  });

  lines.push(...coverage(text, absoluteWords).map((line) => `- ${line}`));

  const innerWord: number[] = [];
  const innerSentence: number[] = [];
  const quiet = await silences(audioPath);
  const innerSentenceAudio: number[] = [];

  for (let n = 1; n < absoluteWords.length; n += 1) {
    const prev = absoluteWords[n - 1];
    const cur = absoluteWords[n];

    if (!prev || !cur || seamAt.includes(n)) {
      continue;
    }

    const after = punctuationAfter[n - 1] ?? '';

    if (/[.!?]/.test(after)) {
      innerSentence.push(cur.start - prev.end);
      innerSentenceAudio.push(silenceAt(quiet, (prev.end + cur.start) / 2));
    } else if (after.length === 0) {
      innerWord.push(cur.start - prev.end);
    }
  }

  const chunkRelative = take.chunks.flatMap((c) =>
    c.words.flatMap((w) => [w.start, w.end]),
  );
  const onGrid = (step: number): boolean => {
    return chunkRelative.every(
      (t) => Math.abs(t / step - Math.round(t / step)) < 1e-6,
    );
  };
  const grid = [0.08, 0.04, 0.02, 0.01].find((step) => onGrid(step));
  const contiguous = take.chunks
    .flatMap((c) =>
      c.words.slice(1).map((w, n) => w.start - (c.words[n]?.end ?? 0)),
    )
    .filter((g) => Math.abs(g) < 1e-6).length;
  lines.push(
    `- word times (chunk-relative) are quantised to ${grid === undefined ? 'no fixed grid' : `${ms(grid)} ms`}; ${String(contiguous)} of ${String(absoluteWords.length - take.chunks.length)} adjacent in-chunk pairs are contiguous (end == next start)`,
  );
  lines.push(
    `- median inter-word gap inside sentences (no punctuation): ${ms(median(innerWord))} ms (n=${String(innerWord.length)}, max ${ms(Math.max(...innerWord))} ms)`,
  );
  lines.push(
    `- non-seam sentence boundaries inside a chunk: aligner gap median ${ms(median(innerSentence))} ms (range ${ms(Math.min(...innerSentence))}–${ms(Math.max(...innerSentence))}), audible silence median ${ms(median(innerSentenceAudio))} ms (range ${ms(Math.min(...innerSentenceAudio))}–${ms(Math.max(...innerSentenceAudio))})`,
  );
  lines.push(
    '',
    '| seam | at (s) | last word before | first word after | aligner gap (ms) | audible silence (ms) | at a sentence end? | listen from (s) |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  );

  seamAt.forEach((n, s) => {
    const prev = absoluteWords[n - 1];
    const cur = absoluteWords[n];

    if (!prev || !cur) {
      return;
    }

    const at = take.chunks[s + 1]?.offset ?? Number.NaN;
    lines.push(
      `| ${String(s + 1)} | ${at.toFixed(2)} | ${prev.text} | ${cur.text} | ${ms(cur.start - prev.end)} | ${ms(silenceAt(quiet, at))} | ${/[.!?]/.test(punctuationAfter[n - 1] ?? '') ? 'yes' : 'NO'} | ${Math.max(0, prev.start - 2).toFixed(1)} |`,
    );
  });

  const backwards = absoluteWords.filter(
    (w, n) => n > 0 && w.start < (absoluteWords[n - 1]?.end ?? 0) - 0.001,
  ).length;
  lines.push(
    '',
    `- non-monotonic word times (restart/overlap smell): ${String(backwards)}`,
  );

  return { absoluteWords, lines };
};

/** Per-sentence take: seams are every sentence join; measure the audible silence there. */
const analysePerSentence = async (
  path: string,
  durations: readonly number[],
): Promise<string[]> => {
  const quiet = await silences(path);
  const gaps: string[] = [];
  let cursor = 0;

  for (const duration of durations.slice(0, -1)) {
    cursor += duration;
    gaps.push(`${cursor.toFixed(2)}s: ${ms(silenceAt(quiet, cursor))} ms`);
  }

  return [
    `- per-sentence joins (audible silence at each concatenation point): ${gaps.join('; ')}`,
  ];
};

// ---------- main ----------

const main = async (): Promise<void> => {
  mkdirSync(RAW, { recursive: true });
  const format = loadFormat();
  const script = parseScript(SLUG);
  const spoken = script.sentences.map((s) => s.spoken).join(' ');
  const report: string[] = [
    `# Fish whole-take spike — ${SLUG} (variant ${script.variant})`,
    `model: ${resolveFishAudioModel()}  voice: DEFAULT_FISH_AUDIO_VOICE  sentences: ${String(script.sentences.length)}  spoken chars: ${String(spoken.length)}`,
  ];

  /* eslint-disable no-await-in-loop -- sequential on purpose: bounded, cached hosted calls */

  // 1. Per-sentence, today's backend path.
  const sentencePcm: Buffer[] = [];
  const sentenceDurations: number[] = [];
  let sentenceRate = 0;

  for (const sentence of script.sentences) {
    const name = `sentence-${String(sentence.index + 1).padStart(3, '0')}.wav`;
    const bytes = await cached(name, async () => {
      const path = join(RAW, `tmp-${name}`);
      await fishAudioBackend.render({
        outputPath: path,
        text: sentence.spoken,
        voice: DEFAULT_FISH_AUDIO_VOICE,
      });
      const body = readFileSync(path);
      rmSync(path);

      return body;
    });
    const wav = parseWav(bytes);
    sentenceRate = wav.sampleRate;
    sentencePcm.push(wav.pcm);
    sentenceDurations.push(wav.pcm.length / 2 / wav.sampleRate);
  }

  const perSentenceRaw = join(OUT, 'per-sentence.raw.wav');
  writeWav(perSentenceRaw, Buffer.concat(sentencePcm), sentenceRate);
  const perSentence = join(OUT, 'per-sentence.normalised.wav');
  await normalise(perSentenceRaw, perSentence);
  report.push(
    `per-sentence native sample rate: ${String(sentenceRate)} (normalised take resampled to ${String(format.audio.sampleRate)})`,
  );

  // 2 + 4. Whole take: service default, then the chunk_length sweep.
  const variants: (number | undefined)[] = [undefined, 100, 200, 300];
  const takes: { label: string; path: string; take: Take }[] = [];

  for (const chunkLength of variants) {
    const label = `whole-${String(chunkLength ?? 'default')}`;
    const raw = await cached(`${label}.sse`, async () =>
      fetchWholeTake(spoken, chunkLength),
    );
    const take = parseSse(raw);
    const rawWav = join(OUT, `${label}.raw.wav`);
    writeWav(
      rawWav,
      Buffer.concat(take.chunks.map((c) => c.pcm)),
      take.sampleRate || format.audio.sampleRate,
    );
    const normalised = join(OUT, `${label}.normalised.wav`);
    await normalise(rawWav, normalised);
    takes.push({ label, path: normalised, take });

    if (chunkLength === undefined) {
      report.push(
        '',
        '## SSE event shapes (whole-default)',
        ...take.eventSummary.map((line) => `- ${line}`),
      );
    }
  }

  // 3. Measure.
  report.push(
    '',
    '## Loudness (normalised takes, ebur128 peak=true)',
    '| take | integrated LUFS | LRA (LU) | true peak (dBTP) | duration (s) | lead / tail silence (s) |',
    '| --- | --- | --- | --- | --- | --- |',
  );

  for (const [label, path] of [
    ['per-sentence', perSentence],
    ...takes.map((t) => [t.label, t.path]),
  ] as const) {
    const m = await measure(path);
    const quiet = await silences(path);
    const lead = quiet[0] && quiet[0].start <= 0.01 ? quiet[0].end : 0;
    const last = quiet.at(-1);
    const isTrailing =
      last !== undefined && last.end >= m.durationSeconds - 0.02;
    const tail = isTrailing ? m.durationSeconds - last.start : 0;
    report.push(
      `| ${label} | ${m.integratedLufs.toFixed(1)} | ${m.lra.toFixed(1)} | ${m.truePeakDb.toFixed(1)} | ${m.durationSeconds.toFixed(2)} | ${lead.toFixed(2)} / ${Math.min(tail, m.durationSeconds).toFixed(2)} |`,
    );
  }

  report.push(
    '',
    '## per-sentence',
    ...(await analysePerSentence(perSentence, sentenceDurations)),
  );

  for (const { label, path, take } of takes) {
    const analysed = await analyseTake(label, take, spoken, path);
    report.push('', ...analysed.lines);
    writeFileSync(
      join(OUT, `${label}.words.json`),
      `${JSON.stringify(analysed.absoluteWords, null, 2)}\n`,
    );
  }

  /* eslint-enable no-await-in-loop */

  report.push(
    '',
    `hosted requests this run: ${String(hostedRequests)} (0 = everything replayed from raw/)`,
  );
  writeFileSync(join(OUT, 'report.md'), `${report.join('\n')}\n`);
  console.log(report.join('\n'));
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  console.error(`hosted requests this run: ${String(hostedRequests)}`);
  process.exit(1);
});
