/**
 * Unit tests for the privacy seam (`utils/privacy`). Split out of the original
 * package-wide `lib.test.ts` so each source module owns its own spec.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyPrivacy,
  buildUsageEvent,
  PRIVACY_LEVELS,
  readTruncatedRepoOptIns,
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

describe('per-repo truncated opt-in', () => {
  const KEY = 'OPENTHROTTLE_TELEMETRY_TRUNCATED_REPOS';
  let tmpRoot: string;
  let home: string;

  const makeRepo = (name: string, remote: string | null): string => {
    const root = path.join(tmpRoot, name);
    fs.mkdirSync(root, { recursive: true });
    execFileSync('git', ['init', '-q'], { cwd: root });
    if (remote !== null) {
      execFileSync('git', ['remote', 'add', 'origin', remote], { cwd: root });
    }
    return root;
  };

  const writeOptIn = (value: string): void => {
    const dir = path.join(home, '.openthrottle');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '.env'), `${KEY}=${value}\n`);
  };

  beforeEach(() => {
    tmpRoot = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'ot-optin-')),
    );
    home = path.join(tmpRoot, 'home');
    fs.mkdirSync(home, { recursive: true });
    vi.stubEnv('HOME', home);
    vi.stubEnv(KEY, '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('raises an opted-in foreign repo to truncated, across remote forms', () => {
    const repo = makeRepo('ssh-remote', 'git@github.com:acme/widgets.git');
    writeOptIn('https://github.com/acme/widgets');
    expect(resolvePrivacyLevel(repo)).toBe(PRIVACY_LEVELS.TRUNCATED);

    const https = makeRepo('https-remote', 'https://github.com/acme/other.git');
    writeOptIn(' git@github.com:acme/other.git , junk ');
    expect(resolvePrivacyLevel(https)).toBe(PRIVACY_LEVELS.TRUNCATED);
  });

  it('keeps a foreign repo that is not listed at name-only', () => {
    const repo = makeRepo('unlisted', 'git@github.com:acme/widgets.git');
    writeOptIn('git@github.com:acme/gadgets.git, https://github.com/acme');
    expect(resolvePrivacyLevel(repo)).toBe(PRIVACY_LEVELS.NAME_ONLY);
  });

  it('never opts in a repo without a remote', () => {
    const repo = makeRepo('no-remote', null);
    writeOptIn('git@github.com:acme/widgets.git, ,');
    expect(resolvePrivacyLevel(repo)).toBe(PRIVACY_LEVELS.NAME_ONLY);
  });

  it('ignores entries that do not normalize and reports them', () => {
    writeOptIn('not a url, git@github.com:acme/widgets.git');
    expect(readTruncatedRepoOptIns()).toEqual({
      invalid: ['not a url'],
      repos: ['https://github.com/acme/widgets'],
    });
  });

  it('ignores the process environment', () => {
    const repo = makeRepo('env-optin', 'git@github.com:acme/widgets.git');
    vi.stubEnv(KEY, 'git@github.com:acme/widgets.git');
    expect(resolvePrivacyLevel(repo)).toBe(PRIVACY_LEVELS.NAME_ONLY);
  });

  it('fails closed for an undefined or unreadable root', () => {
    writeOptIn('git@github.com:acme/widgets.git');
    expect(resolvePrivacyLevel(undefined)).toBe(PRIVACY_LEVELS.NAME_ONLY);
    expect(resolvePrivacyLevel(path.join(tmpRoot, 'missing'))).toBe(
      PRIVACY_LEVELS.NAME_ONLY,
    );
  });

  it('still redacts and caps args for an opted-in repo', () => {
    const repo = makeRepo('redacted', 'git@github.com:acme/widgets.git');
    writeOptIn('git@github.com:acme/widgets.git');
    const event = buildUsageEvent({
      normalized: {
        args: `token=hunter2 ${'z'.repeat(400)}`,
        cwd: '/tmp/x',
        skill_name: 'some-skill',
      },
      repoRoot: repo,
    });
    expect(event?.privacy_level).toBe(PRIVACY_LEVELS.TRUNCATED);
    expect(event?.args).toContain('[REDACTED]');
    expect(event?.args).not.toContain('hunter2');
    expect(event?.args?.length).toBe(257);
  });
});
