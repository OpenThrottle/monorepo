/**
 * @description CLI for the `measure-tool-surface` Nx target: measures the stdio MCP surface and writes it as
 * JSON to the path given as the first argument. The root `monorepo:check-model-facing-text` gate depends on that
 * target and reads the file, so the gate never imports this package's source across the package boundary.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { measureToolSurface } from './measure-tool-surface.ts';

/**
 * @description Measures the tool surface and writes it, pretty-printed, to `outputPath`.
 * @public
 */
export async function writeToolSurface(outputPath: string): Promise<void> {
  const surface = await measureToolSurface();
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(surface, null, 2)}\n`);
}

const outputArgument = process.argv[2];

if (process.argv[1]?.endsWith('write-tool-surface.ts')) {
  if (outputArgument === undefined) {
    process.stderr.write('usage: write-tool-surface.ts <output.json>\n');
    process.exit(2);
  }
  await writeToolSurface(resolve(outputArgument));
}
