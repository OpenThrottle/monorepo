/**
 * @description In-memory ring buffer of browser console output for Settings → Logs and support bundles.
 */

const MAX_ENTRIES = 1000;

const LEVELS = ['log', 'info', 'warn', 'error', 'debug'] as const;

export type ClientLogLevel = (typeof LEVELS)[number];

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
 * @description Stringifies console argument list for a single line.
 */
export const formatLogArgs = (args: readonly unknown[]): string => {
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

const push = (level: ClientLogLevel, args: readonly unknown[]): void => {
  const message = formatLogArgs(args);
  buffer = [...buffer, { level, message, t: Date.now() }].slice(-MAX_ENTRIES);
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
      previous(...args);
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
