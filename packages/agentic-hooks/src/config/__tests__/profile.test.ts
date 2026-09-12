/**
 * Repo classification and the foreign-repo profile it gates.
 *
 * The load-bearing test here is the last one: the contract states the
 * zero-mutation property as something to assert, not to describe — "run the
 * whole capture→persist→drain cycle against an unreachable endpoint with
 * `repoRoot` pointed at a scratch repo, and assert the scratch repo is
 * byte-identical afterwards". That is exactly what it does.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildUsageEvent,
  defaultJsonlPath,
  defaultOutcomesJsonlPath,
  defaultStartsDir,
  drainBufferedUsage,
  persistUsageEvent,
  recordSkillStart,
  REPO_PROFILES,
  resolvePrivacyLevel,
  resolveRepoProfile,
  sweepAbandonedStarts,
} from '../../index';

const makeRepo = (prefix: string, home: boolean): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  if (home) {
    fs.writeFileSync(path.join(root, '.openthrottle.mjs'), 'export {};\n');
  }
  return root;
};

/** Recursive path → sha256 map, so "unchanged" means bytes, not just names. */
const fingerprint = (root: string): ReadonlyMap<string, string> => {
  const out = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full);
      if (entry.isDirectory()) {
        out.set(`${rel}/`, '<dir>');
        walk(full);
      } else {
        out.set(
          rel,
          createHash('sha256').update(fs.readFileSync(full)).digest('hex'),
        );
      }
    }
  };
  walk(root);
  return out;
};

describe('resolveRepoProfile', () => {
  it('classifies a repo carrying the marker as home', () => {
    const root = makeRepo('profile-home-', true);
    expect(resolveRepoProfile(root)).toBe(REPO_PROFILES.HOME);
    fs.rmSync(root, { force: true, recursive: true });
  });

  it('classifies anything else as foreign', () => {
    const root = makeRepo('profile-foreign-', false);
    expect(resolveRepoProfile(root)).toBe(REPO_PROFILES.FOREIGN);
    fs.rmSync(root, { force: true, recursive: true });
  });

  it('fails CLOSED — an unreadable root is foreign, not home', () => {
    // Every other fail path in this package gives up on telemetry. This one
    // must not: guessing `home` wrongly reads a stranger's .env and writes into
    // their working tree.
    expect(resolveRepoProfile('/definitely/does/not/exist')).toBe(
      REPO_PROFILES.FOREIGN,
    );
  });
});

describe('privacy level follows the profile', () => {
  it('collects truncated args at home and none in a foreign repo', () => {
    const home = makeRepo('privacy-home-', true);
    const foreign = makeRepo('privacy-foreign-', false);

    expect(resolvePrivacyLevel(home)).toBe('truncated');
    expect(resolvePrivacyLevel(foreign)).toBe('name-only');

    fs.rmSync(home, { force: true, recursive: true });
    fs.rmSync(foreign, { force: true, recursive: true });
  });

  it('drops args from a foreign event even when the adapter supplied them', () => {
    const foreign = makeRepo('privacy-drop-', false);
    const event = buildUsageEvent({
      gitBranch: 'main',
      normalized: {
        args: 'ssh into prod and cat /etc/shadow',
        cwd: foreign,
        invocation_path: 'slash',
        session_id: 's1',
        skill_name: 'some-skill',
      },
      repoRoot: foreign,
      timestamp: '2026-09-11T00:00:00.000Z',
    });

    expect(event?.privacy_level).toBe('name-only');
    expect(event?.args).toBeNull();
    fs.rmSync(foreign, { force: true, recursive: true });
  });
});

describe('buffer location follows the profile', () => {
  let prevHome: string | undefined;
  let fakeHome: string;

  beforeEach(() => {
    prevHome = process.env.HOME;
    fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-home-dir-'));
    process.env.HOME = fakeHome;
  });

  afterEach(() => {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(fakeHome, { force: true, recursive: true });
  });

  it('keeps buffers inside a home checkout', () => {
    const root = makeRepo('buffer-home-', true);
    expect(defaultJsonlPath(root).startsWith(root)).toBe(true);
    expect(defaultOutcomesJsonlPath(root).startsWith(root)).toBe(true);
    expect(defaultStartsDir(root).startsWith(root)).toBe(true);
    fs.rmSync(root, { force: true, recursive: true });
  });

  it('relocates every buffer out of a foreign checkout', () => {
    const root = makeRepo('buffer-foreign-', false);
    for (const p of [
      defaultJsonlPath(root),
      defaultOutcomesJsonlPath(root),
      defaultStartsDir(root),
    ]) {
      expect(p.startsWith(root)).toBe(false);
      expect(
        p.startsWith(path.join(fakeHome, '.openthrottle', 'skill-usage')),
      ).toBe(true);
    }
    fs.rmSync(root, { force: true, recursive: true });
  });
});

describe('a foreign checkout is never written to', () => {
  let prevHome: string | undefined;
  let prevUrl: string | undefined;
  let fakeHome: string;

  beforeEach(() => {
    prevHome = process.env.HOME;
    prevUrl = process.env.SKILL_USAGE_GRAPHQL_URL;
    fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'zero-mutation-home-'));
    process.env.HOME = fakeHome;
    // Resolvable but dead: forces every persist down the JSONL fallback, which
    // is the path that used to write into the target repo.
    process.env.SKILL_USAGE_GRAPHQL_URL = 'http://127.0.0.1:1/graphql';
  });

  afterEach(() => {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevUrl === undefined) {
      delete process.env.SKILL_USAGE_GRAPHQL_URL;
    } else {
      process.env.SKILL_USAGE_GRAPHQL_URL = prevUrl;
    }
    fs.rmSync(fakeHome, { force: true, recursive: true });
  });

  it('survives a whole capture→persist→drain cycle byte-identical', async () => {
    const repo = makeRepo('zero-mutation-repo-', false);
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'src', 'index.ts'), 'export {};\n');
    fs.writeFileSync(path.join(repo, 'README.md'), '# someone else\n');

    const before = fingerprint(repo);

    const event = buildUsageEvent({
      gitBranch: 'main',
      normalized: {
        args: 'secret args',
        cwd: repo,
        invocation_path: 'slash',
        session_id: 'zero-mutation-session',
        skill_name: 'some-skill',
      },
      repoRoot: repo,
      timestamp: '2026-09-11T00:00:00.000Z',
    });
    expect(event).not.toBeNull();
    if (!event) {
      return;
    }

    recordSkillStart({
      repoRoot: repo,
      scope: event.scope,
      sessionId: event.session_id,
      skillName: event.skill_name,
      startedAt: event.timestamp,
      toolUseId: null,
    });
    await persistUsageEvent({ event, repoRoot: repo });
    await sweepAbandonedStarts({ maxAgeMs: 0, repoRoot: repo });
    await drainBufferedUsage({ budgetMs: 200, repoRoot: repo });

    const after = fingerprint(repo);

    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    expect([...after.entries()].sort()).toEqual([...before.entries()].sort());

    // …and the telemetry really was buffered, so this is not passing because
    // nothing happened at all.
    const stateRoot = path.join(fakeHome, '.openthrottle', 'skill-usage');
    expect(fs.existsSync(stateRoot)).toBe(true);
    expect(fingerprint(stateRoot).size).toBeGreaterThan(0);

    fs.rmSync(repo, { force: true, recursive: true });
  });
});
