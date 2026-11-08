/**
 * Install a bin under a bare command name for spawns that resolve the CLI off
 * PATH through a shell (the drivers engine runs `claude -p …` with
 * `shell: true` and never reads the `*_BIN` override).
 */

import { chmodSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';

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
