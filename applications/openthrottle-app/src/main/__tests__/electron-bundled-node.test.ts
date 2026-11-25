/**
 * @description Guards the Node the desktop app's embedded developer server runs on: Electron's own,
 * recorded in `data.electron-node.ts`. An Electron bump has to update the record, and the recorded
 * Node has to satisfy every `>=` floor in the `engines.node` of the packages the embedded server
 * loads. A range in any other form fails the test, so a person reads it rather than a guess.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { isRecord } from '@openthrottle/nodejs-utils';
import { describe, expect, it } from 'vitest';

import {
  ELECTRON_BUNDLED_NODE,
  EMBEDDED_SERVER_RUNTIME_PACKAGES,
} from '../data/data.electron-node.ts';

const require = createRequire(import.meta.url);

const readManifest = (name: string): Record<string, unknown> => {
  const manifest: unknown = JSON.parse(readFileSync(require.resolve(`${name}/package.json`), 'utf8')); // prettier-ignore

  return isRecord(manifest) ? manifest : {};
};

const parseVersion = (version: string): readonly number[] => {
  return version.replace(/^v/, '').split('.').map((part) => Number.parseInt(part, 10) || 0); // prettier-ignore
};

const isAtLeast = (version: string, floor: string): boolean => {
  const [a1 = 0, a2 = 0, a3 = 0] = parseVersion(version);
  const [b1 = 0, b2 = 0, b3 = 0] = parseVersion(floor);

  if (a1 !== b1) {
    return a1 > b1;
  }

  return a2 === b2 ? a3 >= b3 : a2 > b2;
};

describe('Electron bundled Node', () => {
  it('is recorded for the installed Electron', () => {
    expect(
      readManifest('electron').version,
      'Electron moved: record its Node from https://releases.electronjs.org/releases.json in data.electron-node.ts',
    ).toBe(ELECTRON_BUNDLED_NODE.electron);
  });

  it.each(EMBEDDED_SERVER_RUNTIME_PACKAGES)(
    'satisfies the engines.node of %s',
    (name) => {
      const engines = readManifest(name).engines;
      const declared = isRecord(engines) ? engines.node : undefined;
      const range = typeof declared === 'string' ? declared : '';
      const floor = /^>=\s*(\d+(?:\.\d+){0,2})$/.exec(range.trim())?.[1];

      expect(floor, `${name} engines.node "${range}" is not a plain >= floor; review it by hand`).toBeDefined(); // prettier-ignore
      expect(isAtLeast(ELECTRON_BUNDLED_NODE.node, floor ?? '')).toBe(true);
    },
  );
});
