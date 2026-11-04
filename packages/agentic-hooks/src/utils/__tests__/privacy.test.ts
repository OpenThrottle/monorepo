/**
 * Unit tests for the privacy seam (`utils/privacy`). Split out of the original
 * package-wide `lib.test.ts` so each source module owns its own spec.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  applyPrivacy,
  buildUsageEvent,
  PRIVACY_LEVELS,
  resolvePrivacyLevel,
} from '../../index.ts';

/** Give `root` the marker that identifies an OpenThrottle checkout. */
const makeOpenThrottleCheckout = (root: string): void => {
  const dir = path.join(root, 'applications', 'openthrottle-server');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'openthrottle-server' }),
  );
};

describe('applyPrivacy', () => {
  it('name-only returns null', () => {
    expect(applyPrivacy(PRIVACY_LEVELS.NAME_ONLY, 'hello world')).toBeNull();
  });

  it('truncated caps length and appends ellipsis', () => {
    const long = 'a'.repeat(300);
    const out = applyPrivacy(PRIVACY_LEVELS.TRUNCATED, long, { maxLen: 256 });
    expect(out).not.toBeNull();
    expect(out?.length).toBe(257);
    expect(out?.endsWith('…')).toBe(true);
    expect(out?.slice(0, 256)).toBe('a'.repeat(256));
  });

  it('truncated redacts bearer tokens', () => {
    const out = applyPrivacy(
      PRIVACY_LEVELS.TRUNCATED,
      'Authorization: Bearer abcdefghijklmnop',
    );
    expect(out).toContain('[REDACTED]');
    expect(out).not.toContain('abcdefghijklmnop');
  });

  it('full keeps long args but still redacts secrets', () => {
    const long = `prefix sk-${'x'.repeat(40)} ${'y'.repeat(300)}`;
    const out = applyPrivacy(PRIVACY_LEVELS.FULL, long) ?? '';
    expect(out).toContain('[REDACTED]');
    expect(out).toContain('prefix');
    expect(out).toContain('y'.repeat(300));
    expect(out.length).toBeGreaterThan(256);
    expect(out).not.toContain(`sk-${'x'.repeat(40)}`);
  });

  it('stringifies object args', () => {
    expect(applyPrivacy(PRIVACY_LEVELS.TRUNCATED, { foo: 'bar' })).toBe(
      '{"foo":"bar"}',
    );
  });
});

describe('resolvePrivacyLevel', () => {
  let tmpRoot: string;
  let otRepo: string;
  let foreignRepo: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-privacy-'));
    otRepo = path.join(tmpRoot, 'ot');
    foreignRepo = path.join(tmpRoot, 'foreign');
    makeOpenThrottleCheckout(otRepo);
    fs.mkdirSync(foreignRepo, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('is truncated in an OpenThrottle checkout', () => {
    expect(resolvePrivacyLevel(otRepo)).toBe(PRIVACY_LEVELS.TRUNCATED);
  });

  it('is name-only in a foreign repo', () => {
    expect(resolvePrivacyLevel(foreignRepo)).toBe(PRIVACY_LEVELS.NAME_ONLY);
  });

  it('fails closed to name-only for an undefined or missing root', () => {
    expect(resolvePrivacyLevel(undefined)).toBe(PRIVACY_LEVELS.NAME_ONLY);
    expect(resolvePrivacyLevel(path.join(tmpRoot, 'does-not-exist'))).toBe(
      PRIVACY_LEVELS.NAME_ONLY,
    );
  });

  it('is not satisfied by a same-named marker belonging to another project', () => {
    const impostor = path.join(tmpRoot, 'impostor');
    const dir = path.join(impostor, 'applications', 'openthrottle-server');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'something-else' }),
    );
    expect(resolvePrivacyLevel(impostor)).toBe(PRIVACY_LEVELS.NAME_ONLY);
  });

  describe('through buildUsageEvent', () => {
    const normalized = {
      args: 'a-secret-prompt-the-operator-does-not-own',
      cwd: '/tmp/x',
      skill_name: 'some-skill',
    };

    it('collects no args in a foreign repo when the caller pins nothing', () => {
      const event = buildUsageEvent({
        normalized,
        repoRoot: foreignRepo,
      });
      expect(event?.privacy_level).toBe(PRIVACY_LEVELS.NAME_ONLY);
      expect(event?.args).toBeNull();
    });

    it('still collects truncated args in an OpenThrottle checkout', () => {
      const event = buildUsageEvent({
        normalized,
        repoRoot: otRepo,
      });
      expect(event?.privacy_level).toBe(PRIVACY_LEVELS.TRUNCATED);
      expect(event?.args).toContain('a-secret-prompt');
    });

    it('honours an explicitly pinned level', () => {
      const event = buildUsageEvent({
        normalized,
        privacyLevel: PRIVACY_LEVELS.FULL,
        repoRoot: foreignRepo,
      });
      expect(event?.privacy_level).toBe(PRIVACY_LEVELS.FULL);
    });
  });
});
