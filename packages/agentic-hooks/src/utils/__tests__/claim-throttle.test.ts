import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { tryTakeClaimSlot } from '../claim-throttle.ts';

let stateDir = '';

beforeEach(() => {
  stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claim-throttle-'));
});

afterEach(() => {
  fs.rmSync(stateDir, { force: true, recursive: true });
});

const take = (nowMs: number, sessionId = 's1'): boolean => {
  return tryTakeClaimSlot({ nowMs, sessionId, stateDir, windowMs: 20_000 });
};

describe('tryTakeClaimSlot', () => {
  it('allows the first claim and suppresses one inside the window', () => {
    expect(take(1_000)).toBe(true);
    expect(take(10_000)).toBe(false);
  });

  it('allows a claim once the window has passed', () => {
    expect(take(1_000)).toBe(true);
    expect(take(21_000)).toBe(true);
  });

  it('keys the window by session', () => {
    expect(take(1_000, 'a')).toBe(true);
    expect(take(1_001, 'b')).toBe(true);
  });

  it('fails closed when the state dir cannot be written', () => {
    const blocker = path.join(stateDir, 'file');
    fs.writeFileSync(blocker, '');
    const allowed = tryTakeClaimSlot({
      nowMs: 1,
      sessionId: 's',
      stateDir: path.join(blocker, 'nested'),
      windowMs: 20_000,
    });
    expect(allowed).toBe(false);
  });
});
