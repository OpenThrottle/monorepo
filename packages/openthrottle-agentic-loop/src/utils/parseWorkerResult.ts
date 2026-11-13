import type {
  LoopFollowUp,
  WorkerResult,
  WorkerResultRead,
} from '../contract/index.ts';
import {
  RESULT_FOLLOW_UP_DESCRIPTION_MAX_CHARS,
  RESULT_FOLLOW_UP_TITLE_MAX_CHARS,
  RESULT_FOLLOW_UPS_MAX,
  RESULT_REASON_MAX_CHARS,
  RESULT_SCHEMA_VERSION,
} from '../data/data.constants.ts';

type Parsed<T> =
  | { readonly error: string; readonly ok: false }
  | { readonly ok: true; readonly value: T };

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const fail = (error: string): { error: string; ok: false } => {
  return { error, ok: false };
};

const parseStatus = (value: unknown): Parsed<WorkerResult['status']> => {
  if (value === 'done' || value === 'blocked' || value === 'skipped') {
    return { ok: true, value };
  }

  return fail(`status must be "done", "blocked" or "skipped"`);
};

const parseReason = (value: unknown): Parsed<string> => {
  if (typeof value !== 'string') {
    return fail(`reason must be a string`);
  }

  const trimmed = value.trim();

  if (trimmed.length < 1 || trimmed.length > RESULT_REASON_MAX_CHARS) {
    return fail(`reason must be 1-${RESULT_REASON_MAX_CHARS} characters`);
  }

  return { ok: true, value: trimmed };
};

const parseCommitMessage = (value: unknown): Parsed<string | null> => {
  if (value === null || typeof value === 'string') {
    return { ok: true, value };
  }

  return fail(`commitMessage must be a string or null`);
};

const parseFollowUp = (value: unknown, index: number): Parsed<LoopFollowUp> => {
  const at = `followUps[${index}]`;

  if (!isRecord(value)) {
    return fail(`${at} must be an object`);
  }

  const { category, description, title } = value;

  if (
    typeof title !== 'string' ||
    title.trim().length < 1 ||
    title.length > RESULT_FOLLOW_UP_TITLE_MAX_CHARS
  ) {
    return fail(
      `${at}.title must be a string of 1-${RESULT_FOLLOW_UP_TITLE_MAX_CHARS} characters`,
    );
  }

  if (
    typeof description !== 'string' ||
    description.length > RESULT_FOLLOW_UP_DESCRIPTION_MAX_CHARS
  ) {
    return fail(
      `${at}.description must be a string of at most ${RESULT_FOLLOW_UP_DESCRIPTION_MAX_CHARS} characters`,
    );
  }

  if (category !== null && typeof category !== 'string') {
    return fail(`${at}.category must be a string or null`);
  }

  return { ok: true, value: { category, description, title } };
};

const parseFollowUps = (value: unknown): Parsed<readonly LoopFollowUp[]> => {
  if (!Array.isArray(value)) {
    return fail(`followUps must be an array`);
  }

  if (value.length > RESULT_FOLLOW_UPS_MAX) {
    return fail(`followUps must have at most ${RESULT_FOLLOW_UPS_MAX} items`);
  }

  const items: LoopFollowUp[] = [];

  for (const [index, entry] of value.entries()) {
    const parsed = parseFollowUp(entry, index);

    if (!parsed.ok) {
      return parsed;
    }

    items.push(parsed.value);
  }

  return { ok: true, value: items };
};

/**
 * @description Parses the worker result file (docs/workflows/ot-loop-job.md § 5). Never throws:
 * `undefined` is `missing`; bad JSON or a schema violation is `malformed` with a message naming the
 * field. Unknown keys are ignored.
 * @public
 */
export const parseWorkerResult = (
  raw: string | undefined,
): WorkerResultRead => {
  if (raw === undefined) {
    return { kind: 'missing' };
  }

  let json: unknown;

  try {
    json = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);

    return {
      error: `result file is not valid JSON: ${detail}`,
      kind: 'malformed',
    };
  }

  if (!isRecord(json)) {
    return { error: `result file must be a JSON object`, kind: 'malformed' };
  }

  if (json['version'] !== RESULT_SCHEMA_VERSION) {
    return {
      error: `version must be ${RESULT_SCHEMA_VERSION}`,
      kind: 'malformed',
    };
  }

  const status = parseStatus(json['status']);
  const reason = parseReason(json['reason']);
  const commitMessage = parseCommitMessage(json['commitMessage']);
  const followUps = parseFollowUps(json['followUps']);

  if (!status.ok) {
    return { error: status.error, kind: 'malformed' };
  }

  if (!reason.ok) {
    return { error: reason.error, kind: 'malformed' };
  }

  if (!commitMessage.ok) {
    return { error: commitMessage.error, kind: 'malformed' };
  }

  if (!followUps.ok) {
    return { error: followUps.error, kind: 'malformed' };
  }

  return {
    kind: 'ok',
    result: {
      commitMessage: commitMessage.value,
      followUps: followUps.value,
      reason: reason.value,
      status: status.value,
    },
  };
};
