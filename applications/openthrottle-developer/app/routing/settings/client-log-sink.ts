/**
 * @description In-memory ring buffer of browser console output for Settings → Logs and support bundles.
 *
 * **Captured**
 * - Each call to `console.log`, `console.info`, `console.warn`, `console.error`, and `console.debug`
 *   after {@link installClientLogSink} runs (see `app/entry.client.tsx`).
 * - Global `error` events (`window.addEventListener('error', …)`) and `unhandledrejection`, normalized
 *   to synthetic `error`-level lines.
 *
 * **Not captured**
 * - Output before install (early boot), Web Workers, Service Workers, or network traffic (no HAR).
 *
 * **Memory**
 * - Ring buffer: last {@link CLIENT_LOG_BUFFER_MAX_ENTRIES} entries.
 * - Additional approximate cap on total stored message characters ({@link CLIENT_LOG_BUFFER_MAX_APPROX_CHARS});
 *   oldest entries drop first. Single lines longer than {@link CLIENT_LOG_BUFFER_MAX_MESSAGE_CHARS} are
 *   truncated before storage.
 *
 * **Redaction (best-effort)**
 * - Before storing a line, {@link redactSensitiveLogText} masks common secret shapes: full `authorization:`
 *   header segments (through newline), standalone `Bearer` / `Basic` token prefixes, and `access_token` /
 *   `refresh_token` / `id_token` / `api_key`-style key=value fragments. This is **not** a guarantee against
 *   leaking secrets inside arbitrary JSON or prose—treat copied logs like other diagnostic material.
 *
 * **Safe console proxy**
 * - Original methods are invoked with `Reflect.apply(fn, console, args)` so detached references like
 *   `const log = console.log; log(1)` still reach the native implementation correctly.
 */

/** @description Max lines retained in the in-memory ring buffer (oldest dropped). */
export const CLIENT_LOG_BUFFER_MAX_ENTRIES = 1000;

/**
 * @description Soft ceiling on total characters of stored `message` strings; oldest entries removed first.
 */
const CLIENT_LOG_BUFFER_MAX_APPROX_CHARS = 512 * 1024;

/**
 * @description Max characters stored for a single log line; remainder replaced with a truncation suffix.
 */
const CLIENT_LOG_BUFFER_MAX_MESSAGE_CHARS = 50_000;

const LEVELS = ['log', 'info', 'warn', 'error', 'debug'] as const;

export type ClientLogLevel = (typeof LEVELS)[number];

/** @description All capture levels (for level-filter UI). */
export const CLIENT_LOG_LEVELS: readonly ClientLogLevel[] = LEVELS;

export interface ClientLogEntry {
  readonly level: ClientLogLevel;
  readonly message: string;
  readonly t: number;
}

type ConsoleImpl = (...args: unknown[]) => void;

let buffer: ClientLogEntry[] = [];
const listeners = new Set<() => void>();
let installed = false;
const savedConsole: Partial<Record<ClientLogLevel, ConsoleImpl>> = {};
let errorListener: ((ev: ErrorEvent) => void) | undefined;
let rejectionListener: ((ev: PromiseRejectionEvent) => void) | undefined;

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

/**
 * @description Best-effort removal of common credential substrings from one captured line.
 */
const redactSensitiveLogText = (text: string): string => {
  let out = text;
  // Whole header segment first so we do not leave `Authorization: Bearer` after standalone Bearer redaction.
  out = out.replace(
    /\bauthorization\s*:\s*[^\n]+/gi,
    'authorization: [REDACTED]',
  );
  out = out.replace(/\bBearer\s+[^\s'"]+/gi, 'Bearer [REDACTED]');
  out = out.replace(/\bBasic\s+[^\s'"]+/gi, 'Basic [REDACTED]');
  out = out.replace(
    /\b(access_token|refresh_token|id_token)\s*[=:]\s*[^\s&"',]+/gi,
    '$1=[REDACTED]',
  );
  out = out.replace(
    /\b(api[_-]?key|apikey)\s*[=:]\s*[^\s&"',]+/gi,
    '$1=[REDACTED]',
  );
  return out;
};

/**
 * @description Stringifies console argument list for a single line.
 */
const formatLogArgs = (args: readonly unknown[]): string => {
  return args
    .map((arg) => {
      if (typeof arg === 'string') {
        return arg;
      }
      if (arg instanceof Error) {
        return arg.stack ?? arg.message;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ');
};

const truncateMessage = (message: string): string => {
  if (message.length <= CLIENT_LOG_BUFFER_MAX_MESSAGE_CHARS) {
    return message;
  }
  return `${message.slice(0, CLIENT_LOG_BUFFER_MAX_MESSAGE_CHARS)}… (truncated)`;
};

const push = (level: ClientLogLevel, args: readonly unknown[]): void => {
  const raw = redactSensitiveLogText(formatLogArgs(args));
  const message = truncateMessage(raw);
  buffer = [...buffer, { level, message, t: Date.now() }];
  if (buffer.length > CLIENT_LOG_BUFFER_MAX_ENTRIES) {
    buffer = buffer.slice(-CLIENT_LOG_BUFFER_MAX_ENTRIES);
  }
  let totalChars = buffer.reduce((sum, e) => sum + e.message.length, 0);
  while (totalChars > CLIENT_LOG_BUFFER_MAX_APPROX_CHARS && buffer.length > 0) {
    const dropped = buffer[0];
    buffer = buffer.slice(1);
    if (dropped) {
      totalChars -= dropped.message.length;
    }
  }
  notify();
};

/**
 * @description Returns a snapshot of captured log lines (newest may wrap the buffer).
 */
export const getClientLogEntries = (): readonly ClientLogEntry[] => {
  return buffer;
};

/**
 * @description Clears the in-memory log buffer.
 */
export const clearClientLogSink = (): void => {
  buffer = [];
  notify();
};

/**
 * @description Subscribe to new log lines (and clears). For use with useSyncExternalStore.
 */
export const subscribeClientLogSink = (onChange: () => void): (() => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

/**
 * @description Patches console and records global errors. Idempotent. Browser only.
 */
export const installClientLogSink = (): void => {
  if (typeof window === 'undefined' || installed) {
    return;
  }
  installed = true;

  for (const level of LEVELS) {
    const previous = console[level] as ConsoleImpl;
    savedConsole[level] = previous;
    console[level] = (...args: unknown[]) => {
      push(level, args);
      Reflect.apply(previous, console, args);
    };
  }

  errorListener = (ev: ErrorEvent) => {
    const parts: string[] = [];
    if (ev.message) {
      parts.push(ev.message);
    }
    if (ev.filename) {
      parts.push(`${ev.filename}:${ev.lineno}:${ev.colno}`);
    }
    push('error', [parts.join(' — ') || 'window error']);
  };
  window.addEventListener('error', errorListener);

  rejectionListener = (ev: PromiseRejectionEvent) => {
    const reason =
      ev.reason instanceof Error
        ? (ev.reason.stack ?? ev.reason.message)
        : String(ev.reason);
    push('error', [`unhandledrejection: ${reason}`]);
  };
  window.addEventListener('unhandledrejection', rejectionListener);
};

/**
 * @description Restores console and clears state. For unit tests only.
 */
export const resetClientLogSinkForTesting = (): void => {
  if (typeof window !== 'undefined' && installed) {
    for (const level of LEVELS) {
      const previous = savedConsole[level];
      if (previous) {
        console[level] = previous as (typeof console)[typeof level];
      }
    }
    if (errorListener) {
      window.removeEventListener('error', errorListener);
    }
    if (rejectionListener) {
      window.removeEventListener('unhandledrejection', rejectionListener);
    }
  }
  Object.keys(savedConsole).forEach((k) => {
    delete savedConsole[k as ClientLogLevel];
  });
  errorListener = undefined;
  rejectionListener = undefined;
  installed = false;
  buffer = [];
  listeners.clear();
};
