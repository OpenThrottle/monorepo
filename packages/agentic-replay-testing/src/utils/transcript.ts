/**
 * Read and write the NDJSON transcript format defined in
 * `src/types/transcript.ts`. Parsing never throws: a malformed transcript is a
 * fixture bug, and the caller decides whether to fail a test or a record run.
 */

import { isRecord, isStringArray } from '@openthrottle/nodejs-utils';

import type {
  AcpFrame,
  AcpTranscript,
  ParsedTranscript,
  Transcript,
  TranscriptHeader,
  TranscriptLine,
  TranscriptParseResult,
  TranscriptProtocolsValue,
  TranscriptRpcDirectionsValue,
  TranscriptSurfacesValue,
} from '../types/transcript.ts';
import {
  TRANSCRIPT_CHANNELS,
  TRANSCRIPT_LINE_TYPES,
  TRANSCRIPT_PROTOCOLS,
  TRANSCRIPT_RPC_DIRECTIONS,
  TRANSCRIPT_SCHEMA_VERSION,
  TRANSCRIPT_SURFACES,
} from '../types/transcript.ts';

function isSurface(value: unknown): value is TranscriptSurfacesValue {
  return Object.values(TRANSCRIPT_SURFACES).some(
    (surface) => surface === value,
  );
}

function isProtocol(value: unknown): value is TranscriptProtocolsValue {
  return Object.values(TRANSCRIPT_PROTOCOLS).some((protocol) => {
    return protocol === value;
  });
}

function isRpcDirection(value: unknown): value is TranscriptRpcDirectionsValue {
  return Object.values(TRANSCRIPT_RPC_DIRECTIONS).some((direction) => {
    return direction === value;
  });
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
    const {
      backend,
      cliVersion,
      model,
      protocol,
      recordedAt,
      scenario,
      surface,
    } = value;
    if (
      typeof backend !== 'string' ||
      typeof cliVersion !== 'string' ||
      !isNullableString(model) ||
      (protocol !== undefined && !isProtocol(protocol)) ||
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
      protocol,
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

  if (type === TRANSCRIPT_LINE_TYPES.rpc) {
    const { from, message } = value;
    if (isRpcDirection(from) && isRecord(message)) {
      return { from, message, type };
    }
    return null;
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

/** Fold the lines between the header and the exit into a CLI transcript. */
function foldCli(
  header: TranscriptHeader,
  body: readonly TranscriptLine[],
  exit: Transcript['exit'],
): TranscriptParseResult {
  let argv: readonly string[] | null = null;
  let stdin = '';
  let stderr = '';
  const stdout: string[] = [];

  for (const line of body) {
    if (line.type === TRANSCRIPT_LINE_TYPES.header) {
      return { error: 'more than one header line', ok: false };
    }
    if (line.type === TRANSCRIPT_LINE_TYPES.exit) {
      return { error: 'more than one exit line', ok: false };
    }
    if (line.type === TRANSCRIPT_LINE_TYPES.rpc) {
      return { error: 'a cli transcript carries no rpc lines', ok: false };
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
      exit,
      header,
      protocol: TRANSCRIPT_PROTOCOLS.cli,
      stderr,
      stdin,
      stdout,
    },
  };
}

/** Fold the lines between the header and the exit into an ACP transcript. */
function foldAcp(
  header: TranscriptHeader,
  body: readonly TranscriptLine[],
  exit: AcpTranscript['exit'],
): TranscriptParseResult {
  let argv: readonly string[] | null = null;
  let stderr = '';
  const frames: AcpFrame[] = [];

  for (const line of body) {
    if (line.type === TRANSCRIPT_LINE_TYPES.header) {
      return { error: 'more than one header line', ok: false };
    }
    if (line.type === TRANSCRIPT_LINE_TYPES.exit) {
      return { error: 'more than one exit line', ok: false };
    }
    if (line.type === TRANSCRIPT_LINE_TYPES.rpc) {
      frames.push({ from: line.from, message: line.message });
    } else if (line.channel === TRANSCRIPT_CHANNELS.argv) {
      if (argv !== null) {
        return { error: 'more than one argv line', ok: false };
      }
      argv = line.argv;
    } else if (line.channel === TRANSCRIPT_CHANNELS.stderr) {
      stderr += line.data;
    } else {
      return {
        error: `an acp transcript carries no ${line.channel} lines`,
        ok: false,
      };
    }
  }

  if (argv === null) {
    return { error: 'missing the argv line', ok: false };
  }

  return {
    ok: true,
    transcript: {
      argv,
      exit,
      frames,
      header,
      protocol: TRANSCRIPT_PROTOCOLS.acp,
      stderr,
    },
  };
}

/**
 * Parse NDJSON transcript text. The header must come first and the exit last;
 * exactly one argv line is required. A header without `protocol` is a CLI
 * transcript.
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

  const body = lines.slice(1, -1);
  const exit = { code: last.code, signal: last.signal };

  if (first.protocol === TRANSCRIPT_PROTOCOLS.acp) {
    return foldAcp(first, body, exit);
  }
  return foldCli(first, body, exit);
}

/**
 * Parse a transcript that must be a CLI one: the strict CLI replay paths
 * (replay bin, drift check) call this so an ACP transcript fails clearly
 * instead of being replayed as something it is not.
 *
 * @public
 */
export function parseCliTranscript(
  text: string,
):
  | { readonly error: string; readonly ok: false }
  | { readonly ok: true; readonly transcript: Transcript } {
  const parsed = parseTranscript(text);
  if (!parsed.ok) {
    return parsed;
  }
  if (parsed.transcript.protocol === TRANSCRIPT_PROTOCOLS.acp) {
    return {
      error: 'an acp transcript cannot be used as a cli transcript',
      ok: false,
    };
  }
  return { ok: true, transcript: parsed.transcript };
}

/**
 * Serialize a transcript back to NDJSON, one line per record, newline-ended.
 * A CLI transcript omits empty stdin and stderr and never writes `protocol`
 * (so the bytes match every pre-ACP fixture); an ACP transcript writes
 * `protocol: 'acp'`, its frames as `rpc` lines in order, then stderr.
 *
 * @public
 */
export function serializeTranscript(transcript: ParsedTranscript): string {
  const argvLine: TranscriptLine = {
    argv: transcript.argv,
    channel: TRANSCRIPT_CHANNELS.argv,
    type: TRANSCRIPT_LINE_TYPES.outbound,
  };
  const exitLine: TranscriptLine = {
    code: transcript.exit.code,
    signal: transcript.exit.signal,
    type: TRANSCRIPT_LINE_TYPES.exit,
  };
  const stderrLines: TranscriptLine[] = [];
  if (transcript.stderr !== '') {
    stderrLines.push({
      channel: TRANSCRIPT_CHANNELS.stderr,
      data: transcript.stderr,
      type: TRANSCRIPT_LINE_TYPES.inbound,
    });
  }
  const lines: TranscriptLine[] = [];

  if (transcript.protocol === TRANSCRIPT_PROTOCOLS.acp) {
    lines.push(
      { ...transcript.header, protocol: TRANSCRIPT_PROTOCOLS.acp },
      argvLine,
    );
    for (const frame of transcript.frames) {
      lines.push({
        from: frame.from,
        message: frame.message,
        type: TRANSCRIPT_LINE_TYPES.rpc,
      });
    }
    lines.push(...stderrLines, exitLine);
  } else {
    lines.push({ ...transcript.header, protocol: undefined }, argvLine);
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
    lines.push(...stderrLines, exitLine);
  }

  return `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`;
}
