/**
 * Decide whether a fresh recording has drifted from its committed transcript —
 * structurally, not textually. Model wording, token counts, timings and ids
 * change on every recording and mean nothing; what matters is whether the
 * protocol moved:
 *
 * - **argv / stdin** — compared exactly (both sides are sanitized). A change is
 *   our argv builders or prompt layers moving, or a scenario edit.
 * - **stdout event shapes** — each JSON line reduced to its discriminators
 *   (`type`, `subtype`, `event`, and the `type` of a nested `event`, `item`,
 *   `part`, `message` or `step_update`). The SETS are compared, not the
 *   sequences: how many deltas a reply takes is model drift; a new event type,
 *   or one that vanished, is CLI drift the parsers may not handle.
 * - **exit class** — success, failure, or termination.
 *
 * An ACP transcript is compared the same way: spawn args exactly; the SET of
 * frame shapes (`from` + method, a `session/update`'s `sessionUpdate`/`kind`/
 * `status`, a response's request method plus `stopReason` or error code); and
 * the client's frames exactly, in sequence (`rpc-outbound`) — a changed
 * prompt, param or answer is our code moving, not model drift.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import type {
  AcpFrame,
  AcpTranscript,
  ParsedTranscript,
  Transcript,
} from '../types/transcript.ts';
import { TRANSCRIPT_PROTOCOLS } from '../types/transcript.ts';

/** @public */
export const DRIFT_KINDS = {
  argv: 'argv',
  exit: 'exit',
  protocol: 'protocol',
  rpcOutbound: 'rpc-outbound',
  shapesAdded: 'shapes-added',
  shapesRemoved: 'shapes-removed',
  stdin: 'stdin',
} as const;

export type DriftKindsKey = keyof typeof DRIFT_KINDS;
/** @public */
export type DriftKindsValue = (typeof DRIFT_KINDS)[DriftKindsKey];

/** @public */
export interface DriftFinding {
  readonly detail: string;
  readonly kind: DriftKindsValue;
}

/** @public */
export interface TranscriptComparison {
  /** True when the CLI reports a different version than the committed one. */
  readonly cliVersionChanged: boolean;
  readonly findings: readonly DriftFinding[];
}

const NESTED_DISCRIMINATED_KEYS = [
  'event',
  'item',
  'message',
  'part',
  'step_update',
] as const;

function decode(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

/**
 * The shape key of one stdout line, e.g. `type=stream_event event.type=message_stop`.
 * A line that is not a JSON object is `<non-json>`.
 *
 * @public
 */
export function stdoutShape(line: string): string {
  const event = decode(line);
  if (!isRecord(event)) {
    return '<non-json>';
  }

  const parts: string[] = [];
  for (const key of ['type', 'subtype', 'event'] as const) {
    const value = event[key];
    if (typeof value === 'string') {
      parts.push(`${key}=${value}`);
    }
  }
  for (const key of NESTED_DISCRIMINATED_KEYS) {
    const nested = event[key];
    if (isRecord(nested) && typeof nested.type === 'string') {
      parts.push(`${key}.type=${nested.type}`);
    }
    if (isRecord(nested) && typeof nested.step_type === 'string') {
      parts.push(`${key}.step_type=${nested.step_type}`);
    }
  }

  return parts.length === 0 ? '<untyped-json>' : parts.join(' ');
}

function exitClass(exit: ParsedTranscript['exit']): string {
  if (exit.signal !== null || exit.code === 130 || exit.code === 143) {
    return 'terminated';
  }
  return exit.code === 0 ? 'success' : 'failure';
}

function shapes(transcript: Transcript): Set<string> {
  return new Set(transcript.stdout.map(stdoutShape));
}

function compareCli(
  committed: Transcript,
  fresh: Transcript,
): TranscriptComparison {
  const findings: DriftFinding[] = [];

  const argvMatches =
    committed.argv.length === fresh.argv.length &&
    committed.argv.every((value, index) => value === fresh.argv[index]);
  if (!argvMatches) {
    findings.push({
      detail: `committed ${JSON.stringify(committed.argv)} → fresh ${JSON.stringify(fresh.argv)}`,
      kind: DRIFT_KINDS.argv,
    });
  }

  if (committed.stdin !== fresh.stdin) {
    findings.push({
      detail: `stdin changed (${committed.stdin.length} → ${fresh.stdin.length} chars)`,
      kind: DRIFT_KINDS.stdin,
    });
  }

  const before = shapes(committed);
  const after = shapes(fresh);
  const added = [...after].filter((shape) => !before.has(shape)).sort();
  const removed = [...before].filter((shape) => !after.has(shape)).sort();
  if (added.length > 0) {
    findings.push({ detail: added.join('; '), kind: DRIFT_KINDS.shapesAdded });
  }
  if (removed.length > 0) {
    findings.push({
      detail: removed.join('; '),
      kind: DRIFT_KINDS.shapesRemoved,
    });
  }

  const exitBefore = exitClass(committed.exit);
  const exitAfter = exitClass(fresh.exit);
  if (exitBefore !== exitAfter) {
    findings.push({
      detail: `${exitBefore} → ${exitAfter}`,
      kind: DRIFT_KINDS.exit,
    });
  }

  return {
    cliVersionChanged: committed.header.cliVersion !== fresh.header.cliVersion,
    findings,
  };
}

/**
 * The method each response answers, per direction of the REQUEST: ids are
 * normalized per direction, so a client request and an agent request can both
 * be id 0.
 */
function requestMethods(frames: readonly AcpFrame[]): {
  readonly agent: Map<unknown, string>;
  readonly client: Map<unknown, string>;
} {
  const methods = {
    agent: new Map<unknown, string>(),
    client: new Map<unknown, string>(),
  };
  for (const { from, message } of frames) {
    if (typeof message.method === 'string' && 'id' in message) {
      methods[from].set(message.id, message.method);
    }
  }
  return methods;
}

function updateShape(params: unknown): string {
  const update = isRecord(params) ? params.update : undefined;
  if (!isRecord(update)) {
    return '';
  }
  const parts: string[] = [];
  for (const key of ['sessionUpdate', 'kind', 'status'] as const) {
    const value = update[key];
    if (typeof value === 'string') {
      parts.push(`${key}=${value}`);
    }
  }
  return parts.length === 0 ? '' : ` ${parts.join(' ')}`;
}

function responseShape(
  frame: AcpFrame,
  methods: ReturnType<typeof requestMethods>,
): string {
  const { message } = frame;
  const answered = frame.from === 'agent' ? methods.client : methods.agent;
  const method = answered.get(message.id) ?? '<unknown>';
  if (isRecord(message.error)) {
    return `${frame.from} error:${method} code=${String(message.error.code)}`;
  }
  const { result } = message;
  const isPrompt = method === 'session/prompt' && isRecord(result);
  const stop = isPrompt ? ` stopReason=${String(result.stopReason)}` : '';
  return `${frame.from} result:${method}${stop}`;
}

/**
 * The shape key of one ACP frame, e.g. `agent session/update
 * sessionUpdate=tool_call kind=read status=pending` or `agent
 * result:session/prompt stopReason=end_turn`.
 */
function acpFrameShape(
  frame: AcpFrame,
  methods: ReturnType<typeof requestMethods>,
): string {
  const { method, params } = frame.message;
  if (typeof method !== 'string') {
    return responseShape(frame, methods);
  }
  const detail = method === 'session/update' ? updateShape(params) : '';
  return `${frame.from} ${method}${detail}`;
}

function acpShapes(transcript: AcpTranscript): Set<string> {
  const methods = requestMethods(transcript.frames);
  return new Set(
    transcript.frames.map((frame) => acpFrameShape(frame, methods)),
  );
}

function compareAcp(
  committed: AcpTranscript,
  fresh: AcpTranscript,
): TranscriptComparison {
  const findings: DriftFinding[] = [];

  const argvMatches =
    committed.argv.length === fresh.argv.length &&
    committed.argv.every((value, index) => value === fresh.argv[index]);
  if (!argvMatches) {
    findings.push({
      detail: `committed ${JSON.stringify(committed.argv)} → fresh ${JSON.stringify(fresh.argv)}`,
      kind: DRIFT_KINDS.argv,
    });
  }

  const sent = (transcript: AcpTranscript): string[] => {
    return transcript.frames
      .filter((frame) => frame.from === 'client')
      .map((frame) => JSON.stringify(frame.message));
  };
  const before = sent(committed);
  const after = sent(fresh);
  const first = before.findIndex((frame, index) => frame !== after[index]);
  const isTruncated = first === -1 && before.length !== after.length;
  const at = isTruncated ? Math.min(before.length, after.length) : first;
  if (at !== -1) {
    findings.push({
      detail: `client frame ${at} (of ${before.length} → ${after.length}): committed ${before[at] ?? '<none>'} → fresh ${after[at] ?? '<none>'}`,
      kind: DRIFT_KINDS.rpcOutbound,
    });
  }

  const shapesBefore = acpShapes(committed);
  const shapesAfter = acpShapes(fresh);
  const added = [...shapesAfter]
    .filter((shape) => !shapesBefore.has(shape))
    .sort();
  const removed = [...shapesBefore]
    .filter((shape) => !shapesAfter.has(shape))
    .sort();
  if (added.length > 0) {
    findings.push({ detail: added.join('; '), kind: DRIFT_KINDS.shapesAdded });
  }
  if (removed.length > 0) {
    findings.push({
      detail: removed.join('; '),
      kind: DRIFT_KINDS.shapesRemoved,
    });
  }

  const exitBefore = exitClass(committed.exit);
  const exitAfter = exitClass(fresh.exit);
  if (exitBefore !== exitAfter) {
    findings.push({
      detail: `${exitBefore} → ${exitAfter}`,
      kind: DRIFT_KINDS.exit,
    });
  }

  return {
    cliVersionChanged: committed.header.cliVersion !== fresh.header.cliVersion,
    findings,
  };
}

/**
 * Compare a fresh recording against the committed transcript of the same
 * scenario. Both must use the same protocol; a protocol change is itself a
 * finding.
 *
 * @public
 */
export function compareTranscripts(
  committed: ParsedTranscript,
  fresh: ParsedTranscript,
): TranscriptComparison {
  if (
    committed.protocol === TRANSCRIPT_PROTOCOLS.cli &&
    fresh.protocol === TRANSCRIPT_PROTOCOLS.cli
  ) {
    return compareCli(committed, fresh);
  }
  if (
    committed.protocol === TRANSCRIPT_PROTOCOLS.acp &&
    fresh.protocol === TRANSCRIPT_PROTOCOLS.acp
  ) {
    return compareAcp(committed, fresh);
  }
  return {
    cliVersionChanged: committed.header.cliVersion !== fresh.header.cliVersion,
    findings: [
      {
        detail: `${committed.protocol} → ${fresh.protocol}`,
        kind: DRIFT_KINDS.protocol,
      },
    ],
  };
}
