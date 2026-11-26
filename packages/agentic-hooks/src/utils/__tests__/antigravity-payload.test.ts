/**
 * The Antigravity adapter against a `SessionStart` payload captured verbatim from agy 1.5.9
 * (`./fixtures/`, paths scrubbed): the producer id, and that the heartbeat's one read of the
 * payload — `cwd` — resolves on agy's camelCase envelope.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { readHookPayloadCwd } from '../../index.ts';
import { ANTIGRAVITY_SOURCE } from '../antigravity-payload.ts';

const sessionStart = fs.readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    '..',
    'fixtures',
    'antigravity',
    'session-start.json',
  ),
  'utf8',
);

describe('ANTIGRAVITY_SOURCE', () => {
  it("matches the drivers' id for agy", () => {
    expect(ANTIGRAVITY_SOURCE).toBe('antigravity');
  });
});

describe('a captured SessionStart', () => {
  it('yields its cwd to the heartbeat', () => {
    expect(readHookPayloadCwd(sessionStart)).toBe('/tmp/probe-repo');
  });
});
