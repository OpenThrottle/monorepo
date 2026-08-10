/**
 * Unit tests for scope detection (`utils/scope`). Split out of the original
 * package-wide `lib.test.ts` so each source module owns its own spec.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { detectScope } from '../../index';

describe('detectScope', () => {
  let tmpRoot: string;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-usage-scope-'));
    fs.mkdirSync(path.join(tmpRoot, 'skills', 'ot-plans'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, 'skills-lock.json'),
      JSON.stringify({
        skills: { 'nx-workspace': { source: 'nrwl/nx' } },
        version: 1,
      }),
    );
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('labels skills/ directory as ours', () => {
    expect(detectScope('ot-plans', tmpRoot)).toBe('ours');
  });

  it('labels plugin-namespaced names as third-party', () => {
    expect(detectScope('vercel:deploy', tmpRoot)).toBe('third-party');
    expect(detectScope('engineering:code-review', tmpRoot)).toBe('third-party');
  });

  it('labels skills-lock installs as third-party', () => {
    expect(detectScope('nx-workspace', tmpRoot)).toBe('third-party');
  });

  it('labels unknown names as third-party', () => {
    expect(detectScope('totally-unknown-skill', tmpRoot)).toBe('third-party');
  });
});
