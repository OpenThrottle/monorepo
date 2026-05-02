import { createHash } from 'node:crypto';

/** @description Max UTF-16 code units per path segment (see bullmq-run-output-spec). */
export const KEYED_JSONL_MAX_SEGMENT_UTF16 = 120;

const WINDOWS_RESERVED = new Set(
  [
    'CON',
    'PRN',
    'AUX',
    'NUL',
    ...Array.from({ length: 9 }, (_, i) => `COM${i + 1}`),
    ...Array.from({ length: 9 }, (_, i) => `LPT${i + 1}`),
  ].map((s) => s.toUpperCase()),
);

/**
 * @description First 8 hex chars of SHA-256 of `input` (UTF-8).
 */
export const keyedJsonlHash8 = (input: string): string =>
  createHash('sha256').update(input, 'utf8').digest('hex').slice(0, 8);

/**
 * @description Stable pair hash for collision disambiguation (`queueName\0jobId`).
 */
export const keyedJsonlPairHash8 = (queueName: string, jobId: string): string =>
  keyedJsonlHash8(`${queueName}\0${jobId}`);

const utf16Len = (s: string): number => s.length;

const truncateWithHashSuffix = (
  sanitized: string,
  original: string,
): string => {
  const suffix = `~${keyedJsonlHash8(original)}`;
  const maxBase = KEYED_JSONL_MAX_SEGMENT_UTF16 - suffix.length;

  if (maxBase < 1) {
    return `${sanitized.slice(0, 1)}${suffix}`;
  }

  let base = sanitized;

  if (utf16Len(base) > maxBase) {
    base = base.slice(0, maxBase);
  }

  return `${base}${suffix}`;
};

/**
 * @description Sanitize a queue name or job id for use as a single path segment.
 */
const replacePathAndWindowsForbidden = (input: string): string =>
  input.replace(/[/\\<>:"|?*]/g, '_');

const replaceAsciiControls = (input: string): string => {
  let out = '';

  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);

    if ((code >= 1 && code <= 31) || code === 127) {
      out += '_';
    } else {
      out += input[i] ?? '';
    }
  }

  return out;
};

export const sanitizeKeyedJsonlSegment = (raw: string): string => {
  let s = raw.replace(/\0/g, '_');
  s = replaceAsciiControls(replacePathAndWindowsForbidden(s));
  s = s.replace(/^[\s.]+|[\s.]+$/g, '');
  s = s.replace(/_+/g, '_');

  if (s.length === 0) {
    s = '_';
  }

  const upper = s.toUpperCase();

  if (WINDOWS_RESERVED.has(upper)) {
    s = `${s}_`;
  }

  if (utf16Len(s) > KEYED_JSONL_MAX_SEGMENT_UTF16) {
    s = truncateWithHashSuffix(s, raw);
  }

  return s;
};

export interface KeyedJsonlRelativePathParams {
  readonly queueName: string;
  readonly jobId: string;
  readonly extension: '.jsonl' | '.log';
  /**
   * @description When two logical keys map to the same default path, pass the pair hash (8 hex) so the job file becomes `{jobSegment}~{hash}.ext`.
   */
  readonly collisionJobSuffix?: string;
}

/**
 * @description Relative path under run output base: `{queueSegment}/{jobSegment}[~hash].ext`.
 */
export const buildKeyedJsonlRelativePath = (
  params: KeyedJsonlRelativePathParams,
): string => {
  const queueSegment = sanitizeKeyedJsonlSegment(params.queueName);
  const jobBase = sanitizeKeyedJsonlSegment(params.jobId);
  const jobFile =
    params.collisionJobSuffix === undefined
      ? `${jobBase}${params.extension}`
      : `${jobBase}~${params.collisionJobSuffix}${params.extension}`;

  return `${queueSegment}/${jobFile}`;
};
