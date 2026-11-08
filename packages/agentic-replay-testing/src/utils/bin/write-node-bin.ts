/**
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

import { chmodSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

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
