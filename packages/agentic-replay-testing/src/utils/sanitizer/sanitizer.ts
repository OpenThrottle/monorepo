/**
 * Strip machine- and account-specific values from a recorded transcript so it
 * can be committed, and normalize a live argv the same way so replay can
 * compare it against the recording.
 *
 * Kept dependency-free (node built-ins only): the replay bin imports it
 * directly under Node's type stripping, with no bundler or workspace resolution.
 */

import type { Transcript } from '../../types/transcript.ts';

/**
 * One absolute path to replace with a stable token, e.g. the spawn cwd → `<CWD>`.
 *
 * @public
 */
export interface SanitizerPath {
  readonly path: string;
  readonly token: string;
}

/** @public */
export interface SanitizerOptions {
  /**
   * Absolute paths to tokenize. Longer paths are replaced first, so a cwd under
   * the home directory becomes `<CWD>` rather than `<HOME>/…`.
   */
  readonly paths: readonly SanitizerPath[];
  /**
   * JSON keys whose values are account configuration, replaced wholesale with
   * {@link REDACTED} wherever they appear in a JSON stdout line.
   */
  readonly redactKeys: readonly string[];
}

/** @public */
export interface Sanitizer {
  /** Sanitize a free-text value (an argv element, a stderr chunk). */
  readonly sanitizeText: (text: string) => string;
  /** Sanitize every string in a transcript, header included. */
  readonly sanitizeTranscript: (transcript: Transcript) => Transcript;
}

/**
 * Replacement for a redacted secret or config value.
 *
 * @public
 */
export const REDACTED = `<REDACTED>`;

/**
 * Replacement for any email address.
 *
 * @public
 */
export const REDACTED_EMAIL = `user@example.com`;

/**
 * JSON keys that carry account configuration in the CLIs recorded so far.
 *
 * @public
 */
export const DEFAULT_REDACT_KEYS: readonly string[] = [
  'account',
  'apiKeySource',
  'email',
  'organization',
  'organizationName',
  'plugins',
];

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * Secrets that must never reach a fixture: Anthropic/OpenAI keys, GitHub
 * tokens, bearer headers and JWTs.
 */
const TOKEN_PATTERNS: readonly RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]{8,}/g,
  /sk-[A-Za-z0-9_-]{20,}/g,
  /gh[pousr]_[A-Za-z0-9]{20,}/g,
  /Bearer\s+[A-Za-z0-9._~+/-]+=*/g,
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
];

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

const PLACEHOLDER_UUID_PREFIX = `00000000-0000-4000-8000-`;

/**
 * The nth (1-based) deterministic placeholder UUID. Recorded session ids map
 * onto these in order of first appearance, so a replay test passes
 * `placeholderUuid(1)` as its session id.
 *
 * @public
 */
export function placeholderUuid(index: number): string {
  return `${PLACEHOLDER_UUID_PREFIX}${index.toString(16).padStart(12, '0')}`;
}

function isPlaceholderUuid(value: string): boolean {
  return value.toLowerCase().startsWith(PLACEHOLDER_UUID_PREFIX);
}

/**
 * Create a sanitizer. One instance should cover one transcript: its UUID map is
 * stateful, so a session id in argv and the same id in stdout get the same
 * placeholder.
 *
 * @public
 */
export function createSanitizer(options: SanitizerOptions): Sanitizer {
  // Spread then sort (not `toSorted`): consumers such as openthrottle-server
  // compile this source against an older `lib`.
  const paths = [...options.paths]
    .filter((entry) => entry.path.length > 1)
    .sort((left, right) => right.path.length - left.path.length);
  const redactKeys = new Set(options.redactKeys);
  const uuids = new Map<string, string>();

  const remapUuid = (match: string): string => {
    if (isPlaceholderUuid(match)) {
      return match;
    }
    const key = match.toLowerCase();
    const existing = uuids.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const placeholder = placeholderUuid(uuids.size + 1);
    uuids.set(key, placeholder);
    return placeholder;
  };

  const sanitizeText = (text: string): string => {
    let result = text;
    for (const entry of paths) {
      result = result.split(entry.path).join(entry.token);
    }
    for (const pattern of TOKEN_PATTERNS) {
      result = result.replace(pattern, REDACTED);
    }
    return result
      .replace(EMAIL_PATTERN, REDACTED_EMAIL)
      .replace(UUID_PATTERN, remapUuid);
  };

  const sanitizeValue = (value: unknown): unknown => {
    if (typeof value === 'string') {
      return sanitizeText(value);
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => {
          return [key, redactKeys.has(key) ? REDACTED : sanitizeValue(entry)];
        }),
      );
    }
    return value;
  };

  const sanitizeStdoutLine = (line: string): string => {
    let decoded: unknown;
    try {
      decoded = JSON.parse(line);
    } catch {
      return sanitizeText(line);
    }
    return JSON.stringify(sanitizeValue(decoded));
  };

  const sanitizeTranscript = (transcript: Transcript): Transcript => {
    return {
      argv: transcript.argv.map(sanitizeText),
      exit: transcript.exit,
      header: transcript.header,
      stderr: sanitizeText(transcript.stderr),
      stdin: sanitizeText(transcript.stdin),
      stdout: transcript.stdout.map(sanitizeStdoutLine),
    };
  };

  return { sanitizeText, sanitizeTranscript };
}

/** @public */
export interface LeakCheckOptions {
  /** Literal values that must not appear, e.g. the recording host's home dir. */
  readonly forbidden: readonly string[];
}

/**
 * Report anything a sanitized transcript still leaks: a forbidden literal, an
 * email other than {@link REDACTED_EMAIL}, or a token-shaped secret. An empty
 * array means clean. Used by the record script before writing, and by a guard
 * test over every committed fixture.
 *
 * @public
 */
export function findSanitizerLeaks(
  text: string,
  options: LeakCheckOptions,
): string[] {
  const leaks: string[] = [];

  for (const value of options.forbidden) {
    if (value.length > 1 && text.includes(value)) {
      leaks.push(`forbidden value: ${value}`);
    }
  }

  for (const email of text.match(EMAIL_PATTERN) ?? []) {
    if (email !== REDACTED_EMAIL) {
      leaks.push(`email: ${email}`);
    }
  }

  for (const pattern of TOKEN_PATTERNS) {
    for (const token of text.match(pattern) ?? []) {
      leaks.push(`token: ${token.slice(0, 12)}…`);
    }
  }

  return leaks;
}
