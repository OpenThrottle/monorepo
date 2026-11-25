/**
 * The replay transcript schema. A transcript is one recorded spawn of an agent
 * CLI, stored as NDJSON: a header line, then the outbound traffic the CLI
 * received (argv, stdin), then the inbound traffic it produced (stdout lines,
 * stderr), then its exit. Replay asserts the outbound half strictly and emits
 * the inbound half, so a CLI or argv-builder change fails loudly.
 */

/**
 * Bumped when a transcript written by an older version can no longer be read.
 *
 * @public
 */
export const TRANSCRIPT_SCHEMA_VERSION = 1;

/**
 * The `type` discriminator of every NDJSON line.
 *
 * @public
 */
export const TRANSCRIPT_LINE_TYPES = {
  exit: 'exit',
  header: 'header',
  inbound: 'inbound',
  outbound: 'outbound',
} as const;

export type TranscriptLineTypesKey = keyof typeof TRANSCRIPT_LINE_TYPES;
export type TranscriptLineTypesValue =
  (typeof TRANSCRIPT_LINE_TYPES)[TranscriptLineTypesKey];

/**
 * Which stream an outbound or inbound line belongs to.
 *
 * @public
 */
export const TRANSCRIPT_CHANNELS = {
  argv: 'argv',
  stderr: 'stderr',
  stdin: 'stdin',
  stdout: 'stdout',
} as const;

export type TranscriptChannelsKey = keyof typeof TRANSCRIPT_CHANNELS;
export type TranscriptChannelsValue =
  (typeof TRANSCRIPT_CHANNELS)[TranscriptChannelsKey];

/**
 * Which production seam drove the recording: a chat turn through a
 * conversation backend.
 *
 * @public
 */
export const TRANSCRIPT_SURFACES = {
  conversation: 'conversation',
} as const;

export type TranscriptSurfacesKey = keyof typeof TRANSCRIPT_SURFACES;
/** @public */
export type TranscriptSurfacesValue =
  (typeof TRANSCRIPT_SURFACES)[TranscriptSurfacesKey];

/**
 * First line of every transcript: what was recorded, against which CLI build.
 *
 * @public
 */
export interface TranscriptHeader {
  /** Driver id, e.g. `claude`, `cursor`, `codex`. */
  readonly backend: string;
  /** `<cli> --version` output at record time, trimmed. */
  readonly cliVersion: string;
  /** Model the turn ran on, or null when the account default was used. */
  readonly model: string | null;
  /** ISO-8601 timestamp of the recording. */
  readonly recordedAt: string;
  /** Shared scenario slug, e.g. `simple-turn`, `tool-use`, `resume`. */
  readonly scenario: string;
  readonly schemaVersion: typeof TRANSCRIPT_SCHEMA_VERSION;
  readonly surface: TranscriptSurfacesValue;
  readonly type: typeof TRANSCRIPT_LINE_TYPES.header;
}

/** @public */
export interface TranscriptArgvLine {
  readonly argv: readonly string[];
  readonly channel: typeof TRANSCRIPT_CHANNELS.argv;
  readonly type: typeof TRANSCRIPT_LINE_TYPES.outbound;
}

/** @public */
export interface TranscriptStdinLine {
  readonly channel: typeof TRANSCRIPT_CHANNELS.stdin;
  readonly data: string;
  readonly type: typeof TRANSCRIPT_LINE_TYPES.outbound;
}

/**
 * One stdout line, without its trailing newline.
 *
 * @public
 */
export interface TranscriptStdoutLine {
  readonly channel: typeof TRANSCRIPT_CHANNELS.stdout;
  readonly data: string;
  readonly type: typeof TRANSCRIPT_LINE_TYPES.inbound;
}

/** @public */
export interface TranscriptStderrLine {
  readonly channel: typeof TRANSCRIPT_CHANNELS.stderr;
  readonly data: string;
  readonly type: typeof TRANSCRIPT_LINE_TYPES.inbound;
}

/** @public */
export interface TranscriptExitLine {
  readonly code: number | null;
  readonly signal: string | null;
  readonly type: typeof TRANSCRIPT_LINE_TYPES.exit;
}

/**
 * Any single NDJSON line of a transcript.
 *
 * @public
 */
export type TranscriptLine =
  | TranscriptArgvLine
  | TranscriptExitLine
  | TranscriptHeader
  | TranscriptStderrLine
  | TranscriptStdinLine
  | TranscriptStdoutLine;

/**
 * A parsed transcript, folded into one value per stream.
 *
 * @public
 */
export interface Transcript {
  /** The argv the CLI received, without the binary itself. */
  readonly argv: readonly string[];
  readonly exit: {
    readonly code: number | null;
    readonly signal: string | null;
  };
  readonly header: TranscriptHeader;
  /** All stderr, concatenated. */
  readonly stderr: string;
  /** Everything written to the CLI's stdin; empty when stdin was ignored. */
  readonly stdin: string;
  /** Raw stdout lines in order, newlines stripped. */
  readonly stdout: readonly string[];
}

/**
 * Result of parsing a transcript file.
 *
 * @public
 */
export type TranscriptParseResult =
  | { readonly error: string; readonly ok: false }
  | { readonly ok: true; readonly transcript: Transcript };
