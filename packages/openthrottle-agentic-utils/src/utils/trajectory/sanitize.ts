/**
 * @description Sanitizing a stored ATIF trajectory. Size caps (eval-system ADR, Decision 5): each
 * observation `content` is capped at 16 KiB keeping its head and tail; the whole serialized
 * document is capped at 4 MiB by eliding the oldest observation contents first. Secret redaction
 * of step text uses the same pattern set as `@openthrottle/agentic-hooks` `redactSecrets` — keep
 * them in lockstep when either changes.
 */

import type {
  AtifObservationResult,
  AtifStep,
  AtifTrajectory,
} from '../../types/atif.ts';

/**
 * @description The two size limits, in UTF-8 bytes.
 * @public
 */
export interface TrajectoryLimits {
  readonly observationBytes: number;
  readonly totalBytes: number;
}

/**
 * @description What {@link capTrajectory} returns. `byteSize` is the UTF-8 length of the returned
 * trajectory's JSON; `truncated` records that any cap fired.
 * @public
 */
export interface CapTrajectoryResult {
  readonly byteSize: number;
  readonly trajectory: AtifTrajectory;
  readonly truncated: boolean;
}

/** @public */
export const DEFAULT_TRAJECTORY_LIMITS: TrajectoryLimits = {
  observationBytes: 16 * 1024,
  totalBytes: 4 * 1024 * 1024,
};

/** Room kept for the elision marker so a capped observation still fits its limit. */
const MARKER_RESERVE_BYTES = 40;

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: false });

const byteLength = (value: string): number => {
  return encoder.encode(value).length;
};

const elisionMarker = (elidedBytes: number): string => {
  return `\n…[${elidedBytes} bytes elided]…\n`;
};

/**
 * @description Decodes a byte slice, dropping a multibyte character the slice cut in half so the
 * result is always valid text.
 */
const decodeWhole = (bytes: Uint8Array): string => {
  return decoder.decode(bytes).replace(/^�+|�+$/g, '');
};

/**
 * @description Keeps the head and tail of `content` within `limit` bytes, with a marker between.
 * Content already within the limit is returned as is.
 */
const capContent = (content: string, limit: number): string => {
  const bytes = encoder.encode(content);

  if (bytes.length <= limit) return content;

  const half = Math.max(0, Math.floor((limit - MARKER_RESERVE_BYTES) / 2));
  const head = decodeWhole(bytes.subarray(0, half));
  const tail = decodeWhole(bytes.subarray(bytes.length - half));
  const elided = bytes.length - byteLength(head) - byteLength(tail);

  return `${head}${elisionMarker(elided)}${tail}`;
};

const mapResults = (
  steps: readonly AtifStep[],
  transform: (result: AtifObservationResult) => AtifObservationResult,
): AtifStep[] => {
  return steps.map((step) => {
    if (!step.observation) return step;

    return {
      ...step,
      observation: { results: step.observation.results.map(transform) },
    };
  });
};

const withSteps = (
  trajectory: AtifTrajectory,
  steps: readonly AtifStep[],
): AtifTrajectory => {
  return { ...trajectory, steps };
};

const serializedBytes = (trajectory: AtifTrajectory): number => {
  return byteLength(JSON.stringify(trajectory));
};

/**
 * @description Applies the per-observation and whole-document caps. Never mutates the input.
 * Elision of the total cap proceeds oldest observation first, replacing each content with the
 * marker alone, and stops as soon as the document fits (it can stay over only when the
 * non-observation parts alone exceed the limit).
 * @public
 */
export const capTrajectory = (
  trajectory: AtifTrajectory,
  limits: TrajectoryLimits = DEFAULT_TRAJECTORY_LIMITS,
): CapTrajectoryResult => {
  let truncated = false;
  const perObservation = mapResults(trajectory.steps, (result) => {
    const capped = capContent(result.content, limits.observationBytes);

    if (capped !== result.content) truncated = true;

    return capped === result.content ? result : { ...result, content: capped };
  });
  const current = withSteps(trajectory, perObservation);
  let size = serializedBytes(current);

  if (size <= limits.totalBytes) {
    return { byteSize: size, trajectory: current, truncated };
  }

  // Plan the elisions first, oldest observation first, tracking the size exactly: a string's
  // JSON form is its content escaped inside two quotes, so swapping content changes the document
  // by the difference of the two escaped lengths.
  const jsonBytes = (value: string): number => {
    return byteLength(JSON.stringify(value));
  };
  const elisions = new Map<string, string>();
  const keyOf = (stepIndex: number, resultIndex: number): string => {
    return `${stepIndex}:${resultIndex}`;
  };

  current.steps.forEach((step, stepIndex) => {
    (step.observation?.results ?? []).forEach((result, resultIndex) => {
      if (size <= limits.totalBytes) return;

      const marker = elisionMarker(byteLength(result.content));
      const saved = jsonBytes(result.content) - jsonBytes(marker);

      if (saved <= 0) return;

      elisions.set(keyOf(stepIndex, resultIndex), marker);
      size -= saved;
    });
  });

  if (elisions.size === 0) {
    return { byteSize: size, trajectory: current, truncated };
  }

  const elidedSteps = current.steps.map((step, stepIndex) => {
    if (!step.observation) return step;

    return {
      ...step,
      observation: {
        results: step.observation.results.map((result, resultIndex) => {
          const marker = elisions.get(keyOf(stepIndex, resultIndex));

          return marker === undefined ? result : { ...result, content: marker };
        }),
      },
    };
  });
  const elided = withSteps(current, elidedSteps);

  return {
    byteSize: serializedBytes(elided),
    trajectory: elided,
    truncated: true,
  };
};

const SECRET_PATTERNS: readonly RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._\-+=/]+/gi,
  /\bsk-[A-Za-z0-9]{8,}/gi,
  /\b(password|passwd|pwd|secret|token|api[_-]?key)\s*[=:]\s*\S+/gi,
  /\bAIza[0-9A-Za-z\-_]{20,}/gi,
  /\bghp_[A-Za-z0-9]{20,}/gi,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/gi,
];

/**
 * @description Redact known secret shapes from trajectory message text.
 * @public
 */
export const redactSecrets = (value: string): string => {
  let out = value;

  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    out = out.replace(pattern, '[REDACTED]');
  }

  return out;
};
