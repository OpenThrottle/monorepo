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
  rpc: 'rpc',
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
 * How the recorded agent was driven. `cli` is one headless spawn per turn
 * (argv, stdin, stdout lines); `acp` is one long-lived agent process speaking
 * newline-delimited JSON-RPC both ways (`rpc` lines). A header without the
 * field is `cli`.
 *
 * @public
 */
export const TRANSCRIPT_PROTOCOLS = {
  acp: 'acp',
  cli: 'cli',
} as const;

export type TranscriptProtocolsKey = keyof typeof TRANSCRIPT_PROTOCOLS;
/** @public */
export type TranscriptProtocolsValue =
  (typeof TRANSCRIPT_PROTOCOLS)[TranscriptProtocolsKey];

/**
 * Which side of an ACP connection sent a frame.
 *
 * @public
 */
export const TRANSCRIPT_RPC_DIRECTIONS = {
  agent: 'agent',
  client: 'client',
} as const;

export type TranscriptRpcDirectionsKey = keyof typeof TRANSCRIPT_RPC_DIRECTIONS;
/** @public */
export type TranscriptRpcDirectionsValue =
  (typeof TRANSCRIPT_RPC_DIRECTIONS)[TranscriptRpcDirectionsKey];

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
  /**
   * Written only for `acp`; undefined (absent on disk) means `cli`, so every
   * transcript recorded before ACP existed parses and re-serializes unchanged.
   */
  readonly protocol: TranscriptProtocolsValue | undefined;
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
 * One JSON-RPC 2.0 frame (request, response or notification) as a decoded
 * object.
 *
 * @public
 */
export type AcpMessage = Readonly<Record<string, unknown>>;

/**
 * One ACP frame: which side sent it, and the frame itself. Frames sit in wire
 * order.
 *
 * @public
 */
export interface AcpFrame {
  readonly from: TranscriptRpcDirectionsValue;
  readonly message: AcpMessage;
}

/**
 * One ACP frame on the wire, in an ACP transcript only.
 *
 * @public
 */
export interface TranscriptRpcLine {
  readonly from: TranscriptRpcDirectionsValue;
  readonly message: AcpMessage;
  readonly type: typeof TRANSCRIPT_LINE_TYPES.rpc;
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
  | TranscriptRpcLine
  | TranscriptStderrLine
  | TranscriptStdinLine
  | TranscriptStdoutLine;

/**
 * A parsed CLI transcript, folded into one value per stream.
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
  readonly protocol: typeof TRANSCRIPT_PROTOCOLS.cli;
  /** All stderr, concatenated. */
  readonly stderr: string;
  /** Everything written to the CLI's stdin; empty when stdin was ignored. */
  readonly stdin: string;
  /** Raw stdout lines in order, newlines stripped. */
  readonly stdout: readonly string[];
}

/**
 * A parsed ACP transcript: one agent process lifetime, possibly several turns.
 *
 * @public
 */
export interface AcpTranscript {
  /** The args the agent was spawned with, without the binary itself. */
  readonly argv: readonly string[];
  readonly exit: {
    readonly code: number | null;
    readonly signal: string | null;
  };
  /** Every JSON-RPC frame, both directions, in wire order. */
  readonly frames: readonly AcpFrame[];
  readonly header: TranscriptHeader;
  readonly protocol: typeof TRANSCRIPT_PROTOCOLS.acp;
  /** All stderr, concatenated (a non-JSON stdout line lands here too). */
  readonly stderr: string;
}

/**
 * Either kind of parsed transcript; narrow on `protocol`.
 *
 * @public
 */
export type ParsedTranscript = AcpTranscript | Transcript;

/**
 * Result of parsing a transcript file.
 *
 * @public
 */
export type TranscriptParseResult =
  | { readonly error: string; readonly ok: false }
  | { readonly ok: true; readonly transcript: ParsedTranscript };
