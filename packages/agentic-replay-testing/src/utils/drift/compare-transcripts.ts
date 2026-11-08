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
 */

import type { Transcript } from '../../types/transcript.ts';

/** @public */
export const DRIFT_KINDS = {
  argv: 'argv',
  exit: 'exit',
  shapesAdded: 'shapes-added',
  shapesRemoved: 'shapes-removed',
  stdin: 'stdin',
} as const;

/** @public */
export type DriftKind = (typeof DRIFT_KINDS)[keyof typeof DRIFT_KINDS];

/** @public */
export interface DriftFinding {
  readonly detail: string;
  readonly kind: DriftKind;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

function exitClass(exit: Transcript['exit']): string {
  if (exit.signal !== null || exit.code === 130 || exit.code === 143) {
    return 'terminated';
  }
  return exit.code === 0 ? 'success' : 'failure';
}

function shapes(transcript: Transcript): Set<string> {
  return new Set(transcript.stdout.map(stdoutShape));
}

/**
 * Compare a fresh recording against the committed transcript of the same
 * scenario.
 *
 * @public
 */
export function compareTranscripts(
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
