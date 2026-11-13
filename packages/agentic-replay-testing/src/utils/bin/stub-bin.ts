import { chmodSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { pathToFileURL } from 'node:url';

/*
 * Write a tiny executable that imports one of this package's modules and calls
 * an exported entry point with baked-in options. Both the recording shim and
 * the replay bin are installed this way, through a backend's `*_BIN` env
 * override.
 *
 * Options are baked into the script rather than passed by env because every CLI
 * backend scrubs its child's environment down to an allowlist. The shebang is
 * the absolute path of the running node, since the scrubbed PATH may not find
 * the same one.
 */

/** @public */
export interface WriteNodeBinOptions {
  /** Directory to write the bin into. */
  readonly dir: string;
  /** Name of the exported async function to call. */
  readonly entry: string;
  /** Absolute path of the `.ts` module exporting {@link entry}. */
  readonly modulePath: string;
  /** Base name of the bin; `.mjs` is appended so the script is always ESM. */
  readonly name: string;
  /** JSON-serializable options passed to {@link entry}. */
  readonly options: Readonly<Record<string, unknown>>;
}

/**
 * Write the bin and return its absolute path.
 *
 * @public
 */
export function writeNodeBin(options: WriteNodeBinOptions): string {
  const path = join(options.dir, `${options.name}.mjs`);
  const moduleUrl = pathToFileURL(options.modulePath).href;
  const script = [
    `#!${process.execPath}`,
    `import { ${options.entry} } from ${JSON.stringify(moduleUrl)};`,
    `await ${options.entry}(${JSON.stringify(options.options)});`,
    '',
  ].join('\n');

  writeFileSync(path, script, 'utf8');
  chmodSync(path, 0o755);

  return path;
}

/*
 * Point a backend's `*_BIN` env override at a bin for the duration of `run`,
 * restoring the previous value afterwards. The backends read the override from
 * `process.env` at spawn time, so this is process-global: never overlap two
 * calls (Vitest runs the tests within one file sequentially by default).
 *
 * @public
 */

export async function withBinEnv<TResult>(
  binEnv: string,
  bin: string,
  run: () => Promise<TResult>,
): Promise<TResult> {
  const previous = process.env[binEnv];
  process.env[binEnv] = bin;

  try {
    return await run();
  } finally {
    if (previous === undefined) {
      delete process.env[binEnv];
    } else {
      process.env[binEnv] = previous;
    }
  }
}

/*
 * Install a bin under a bare command name for spawns that resolve the CLI off
 * PATH through a shell (the drivers engine runs `claude -p …` with
 * `shell: true` and never reads the `*_BIN` override).
 */

/**
 * Write `<dir>/<name>`, a POSIX shell alias that execs `target` with the
 * running node. Returns its path.
 *
 * @public
 */
export function writePathAlias(
  dir: string,
  name: string,
  target: string,
): string {
  const path = join(dir, name);
  const script = `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(target)} "$@"\n`;
  writeFileSync(path, script, 'utf8');
  chmodSync(path, 0o755);
  return path;
}

/**
 * Prepend `dir` to `process.env.PATH` for the duration of `run`. The drivers
 * engine merges its env over `process.env`, so a child shell resolves the
 * alias first. Process-global, like `withBinEnv`: never overlap two calls.
 *
 * @public
 */
export async function withPathPrepended<TResult>(
  dir: string,
  run: () => Promise<TResult>,
): Promise<TResult> {
  const previous = process.env.PATH;
  process.env.PATH =
    previous === undefined ? dir : `${dir}${delimiter}${previous}`;

  try {
    return await run();
  } finally {
    if (previous === undefined) {
      delete process.env.PATH;
    } else {
      process.env.PATH = previous;
    }
  }
}
