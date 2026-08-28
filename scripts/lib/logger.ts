/**
 * @description Shared chalk-based logger for repo scripts. One visual language
 * across every script: `heading` for phase banners, `step` for actions in
 * flight, `success`/`warn`/`fail` for outcomes, `detail` for dim supporting
 * lines. Chalk natively honors NO_COLOR and non-TTY output, so no color
 * handling lives here.
 *
 * Scripts with a stdout contract (anything piped, eval'd, or speaking a wire
 * protocol such as the WorktreeCreate hook or an MCP stdio launcher) must
 * construct their logger with `stream: process.stderr` so narration never
 * pollutes stdout.
 */
/**
 * chalk is resolved dynamically so the worktree-provisioning scripts can run
 * in a fresh linked worktree BEFORE `pnpm install` (no node_modules yet, tsx
 * borrowed from the primary checkout). When chalk is unresolvable the logger
 * degrades to plain uncolored text instead of crashing the bootstrap.
 */
interface Palette {
  bold: (text: string) => string;
  boldGreen: (text: string) => string;
  boldMagenta: (text: string) => string;
  boldRed: (text: string) => string;
  boldYellow: (text: string) => string;
  cyan: (text: string) => string;
  dim: (text: string) => string;
}

const identity = (text: string): string => text;

const loadPalette = async (): Promise<Palette> => {
  try {
    const { default: chalk } = await import('chalk');

    return {
      bold: (text: string): string => chalk.bold(text),
      boldGreen: (text: string): string => chalk.bold.green(text),
      boldMagenta: (text: string): string => chalk.bold.magenta(text),
      boldRed: (text: string): string => chalk.bold.red(text),
      boldYellow: (text: string): string => chalk.bold.yellow(text),
      cyan: (text: string): string => chalk.cyan(text),
      dim: (text: string): string => chalk.dim(text),
    };
  } catch {
    return {
      bold: identity,
      boldGreen: identity,
      boldMagenta: identity,
      boldRed: identity,
      boldYellow: identity,
      cyan: identity,
      dim: identity,
    };
  }
};

const palette = await loadPalette();

/** Plain-text markers shared by every script; test assertions target these. */
export const SYMBOLS = {
  fail: '✗',
  step: '→',
  success: '✓',
  warn: '⚠',
} as const;

export interface LoggerOptions {
  /** Where narration is written; default stdout. Use stderr for stdout-contract scripts. */
  stream?: NodeJS.WritableStream;
  /** When false, `detail` lines are suppressed; default true. */
  verbose?: boolean;
}

export interface Logger {
  /** A dim empty line, for breathing room between blocks. */
  blank: () => void;
  /** Dim supporting line, suppressed when `verbose` is false. */
  detail: (message: string) => void;
  /** Red ✗ line for failures. Does not exit — callers own exit codes. */
  fail: (message: string) => void;
  /** Bold banner announcing a phase of work. */
  heading: (message: string) => void;
  /** Plain informational line. */
  info: (message: string) => void;
  /** Arrow-prefixed line for an action in flight. */
  step: (message: string) => void;
  /** Green ✓ line for completed work. */
  success: (message: string) => void;
  /** Yellow ⚠ line for non-fatal problems. */
  warn: (message: string) => void;
}

/**
 * Build a logger bound to a stream. Every script creates exactly one and
 * passes it down; the `stream` choice is the script's output contract.
 */
export const createLogger = (options: LoggerOptions = {}): Logger => {
  const stream = options.stream ?? process.stdout;
  const verbose = options.verbose ?? true;

  const write = (line: string): void => {
    stream.write(`${line}\n`);
  };

  return {
    blank: (): void => {
      write('');
    },
    detail: (message: string): void => {
      if (verbose) {
        write(palette.dim(`  ${message}`));
      }
    },
    fail: (message: string): void => {
      write(`${palette.boldRed(SYMBOLS.fail)} ${message}`);
    },
    heading: (message: string): void => {
      write(`\n${palette.bold(`▶ ${message}`)}\n`);
    },
    info: (message: string): void => {
      write(palette.dim(message));
    },
    step: (message: string): void => {
      write(`${palette.boldMagenta(SYMBOLS.step)} ${palette.dim(message)}`);
    },
    success: (message: string): void => {
      write(`${palette.boldGreen(SYMBOLS.success)} ${palette.dim(message)}`);
    },
    warn: (message: string): void => {
      write(`${palette.boldYellow(SYMBOLS.warn)} ${palette.dim(message)}`);
    },
  };
};
