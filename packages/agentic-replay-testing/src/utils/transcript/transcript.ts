/**
 * Read and write the NDJSON transcript format defined in
 * `src/types/transcript.ts`. Parsing never throws: a malformed transcript is a
 * fixture bug, and the caller decides whether to fail a test or a record run.
 */

import {
  type Transcript,
  TRANSCRIPT_CHANNELS,
  TRANSCRIPT_LINE_TYPES,
  TRANSCRIPT_SCHEMA_VERSION,
  TRANSCRIPT_SURFACES,
  type TranscriptHeader,
  type TranscriptLine,
  type TranscriptParseResult,
  type TranscriptSurface,
} from '../../types/transcript.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function isSurface(value: unknown): value is TranscriptSurface {
  return Object.values(TRANSCRIPT_SURFACES).some(
    (surface) => surface === value,
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

/**
 * Narrow one decoded JSON value to a {@link TranscriptLine}, or null.
 */
function toTranscriptLine(value: unknown): TranscriptLine | null {
  if (!isRecord(value)) {
    return null;
  }

  const { channel, type } = value;

  if (type === TRANSCRIPT_LINE_TYPES.header) {
    const { backend, cliVersion, model, recordedAt, scenario, surface } = value;
    if (
      typeof backend !== 'string' ||
      typeof cliVersion !== 'string' ||
      !isNullableString(model) ||
      typeof recordedAt !== 'string' ||
      typeof scenario !== 'string' ||
      value.schemaVersion !== TRANSCRIPT_SCHEMA_VERSION ||
      !isSurface(surface)
    ) {
      return null;
    }
    return {
      backend,
      cliVersion,
      model,
      recordedAt,
      scenario,
      schemaVersion: TRANSCRIPT_SCHEMA_VERSION,
      surface,
      type,
    };
  }

  if (type === TRANSCRIPT_LINE_TYPES.exit) {
    const { code, signal } = value;
    const validCode = code === null || typeof code === 'number';
    if (!validCode || !isNullableString(signal)) {
      return null;
    }
    return { code, signal, type };
  }

  if (type === TRANSCRIPT_LINE_TYPES.outbound) {
    if (channel === TRANSCRIPT_CHANNELS.argv && isStringArray(value.argv)) {
      return { argv: value.argv, channel, type };
    }
    if (
      channel === TRANSCRIPT_CHANNELS.stdin &&
      typeof value.data === 'string'
    ) {
      return { channel, data: value.data, type };
    }
    return null;
  }

  if (
    type === TRANSCRIPT_LINE_TYPES.inbound &&
    typeof value.data === 'string'
  ) {
    if (channel === TRANSCRIPT_CHANNELS.stdout) {
      return { channel, data: value.data, type };
    }
    if (channel === TRANSCRIPT_CHANNELS.stderr) {
      return { channel, data: value.data, type };
    }
  }

  return null;
}

function decodeLine(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Parse NDJSON transcript text. The header must come first and the exit last;
 * exactly one argv line is required.
 *
 * @public
 */
export function parseTranscript(text: string): TranscriptParseResult {
  const rawLines = text.split('\n').filter((line) => line.trim() !== '');
  const lines: TranscriptLine[] = [];

  for (const [index, raw] of rawLines.entries()) {
    const line = toTranscriptLine(decodeLine(raw));
    if (line === null) {
      return { error: `line ${index + 1} is not a transcript line`, ok: false };
    }
    lines.push(line);
  }

  const [first] = lines;
  const last = lines.at(-1);
  if (first?.type !== TRANSCRIPT_LINE_TYPES.header) {
    return { error: 'the first line must be the header', ok: false };
  }
  if (last?.type !== TRANSCRIPT_LINE_TYPES.exit) {
    return { error: 'the last line must be the exit', ok: false };
  }

  let argv: readonly string[] | null = null;
  let stdin = '';
  let stderr = '';
  const stdout: string[] = [];

  for (const line of lines.slice(1, -1)) {
    if (line.type === TRANSCRIPT_LINE_TYPES.header) {
      return { error: 'more than one header line', ok: false };
    }
    if (line.type === TRANSCRIPT_LINE_TYPES.exit) {
      return { error: 'more than one exit line', ok: false };
    }
    if (line.channel === TRANSCRIPT_CHANNELS.argv) {
      if (argv !== null) {
        return { error: 'more than one argv line', ok: false };
      }
      argv = line.argv;
    } else if (line.channel === TRANSCRIPT_CHANNELS.stdin) {
      stdin += line.data;
    } else if (line.channel === TRANSCRIPT_CHANNELS.stdout) {
      stdout.push(line.data);
    } else {
      stderr += line.data;
    }
  }

  if (argv === null) {
    return { error: 'missing the argv line', ok: false };
  }

  return {
    ok: true,
    transcript: {
      argv,
      exit: { code: last.code, signal: last.signal },
      header: first,
      stderr,
      stdin,
      stdout,
    },
  };
}

/**
 * Serialize a transcript back to NDJSON, one line per record, newline-ended.
 * Empty stdin and stderr are omitted so a fixture carries only what happened.
 *
 * @public
 */
export function serializeTranscript(transcript: Transcript): string {
  const header: TranscriptHeader = transcript.header;
  const lines: TranscriptLine[] = [
    header,
    {
      argv: transcript.argv,
      channel: TRANSCRIPT_CHANNELS.argv,
      type: TRANSCRIPT_LINE_TYPES.outbound,
    },
  ];

  if (transcript.stdin !== '') {
    lines.push({
      channel: TRANSCRIPT_CHANNELS.stdin,
      data: transcript.stdin,
      type: TRANSCRIPT_LINE_TYPES.outbound,
    });
  }

  for (const data of transcript.stdout) {
    lines.push({
      channel: TRANSCRIPT_CHANNELS.stdout,
      data,
      type: TRANSCRIPT_LINE_TYPES.inbound,
    });
  }

  if (transcript.stderr !== '') {
    lines.push({
      channel: TRANSCRIPT_CHANNELS.stderr,
      data: transcript.stderr,
      type: TRANSCRIPT_LINE_TYPES.inbound,
    });
  }

  lines.push({
    code: transcript.exit.code,
    signal: transcript.exit.signal,
    type: TRANSCRIPT_LINE_TYPES.exit,
  });

  return `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`;
}
