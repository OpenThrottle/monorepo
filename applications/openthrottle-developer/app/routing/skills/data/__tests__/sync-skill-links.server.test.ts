// @vitest-environment node
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { SKILL_CREATE_COPY } from '~/routing/skills/data/data.copy';
import { syncSkillLinks } from '~/routing/skills/data/sync-skill-links.server';

const SCRIPT_RELATIVE_PATH = 'skills/ot-skill-sync/scripts/sync.sh';

/**
 * A stand-in for sync.sh. Running the real script would mutate the developer's
 * checkout, and what this module actually owns is the envelope around the
 * subprocess — the path guard, the pinned cwd, and how a non-zero exit surfaces.
 */
const writeStubScript = (root: string, body: string): string => {
  const scriptPath = join(root, SCRIPT_RELATIVE_PATH);
  mkdirSync(join(root, 'skills/ot-skill-sync/scripts'), { recursive: true });
  writeFileSync(scriptPath, `#!/bin/bash\n${body}\n`);
  chmodSync(scriptPath, 0o755);
  return scriptPath;
};

describe('syncSkillLinks', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'ot-sync-skill-links-'));
  });

  afterEach(() => {
    rmSync(root, { force: true, recursive: true });
  });

  test('succeeds when the script exits zero', () => {
    writeStubScript(root, 'exit 0');

    expect(syncSkillLinks(root)).toEqual({ ok: true });
  });

  test('reports a non-zero exit as a sync failure', () => {
    writeStubScript(root, 'echo "drift detected" >&2; exit 1');

    expect(syncSkillLinks(root)).toEqual({
      error: SKILL_CREATE_COPY.syncFailedError,
      ok: false,
    });
  });

  test('refuses when the script is absent from the checkout', () => {
    expect(syncSkillLinks(root)).toEqual({
      error: SKILL_CREATE_COPY.syncScriptMissingError,
      ok: false,
    });
  });

  // Load-bearing: sync's own detect_repo_root is `git rev-parse --show-toplevel`,
  // so cwd is what decides which repository gets synced.
  test('pins the working directory to the monorepo root', () => {
    const marker = join(root, 'cwd.txt');
    writeStubScript(root, `pwd > "${marker}"`);

    expect(syncSkillLinks(root)).toEqual({ ok: true });

    const recorded = readFileSync(marker, 'utf8').trim();
    expect(recorded).toBe(realpathSync(root));
  });

  test('passes no arguments to the script', () => {
    const marker = join(root, 'argc.txt');
    writeStubScript(root, `echo "$#" > "${marker}"`);

    expect(syncSkillLinks(root)).toEqual({ ok: true });
    expect(readFileSync(marker, 'utf8').trim()).toBe('0');
  });

  test('forwards the personal skills root so sync resolves the same one', () => {
    const marker = join(root, 'env.txt');
    writeStubScript(
      root,
      `echo "$OPENTHROTTLE_PERSONAL_SKILLS_DIR" > "${marker}"`,
    );

    const original = process.env.OPENTHROTTLE_PERSONAL_SKILLS_DIR;
    process.env.OPENTHROTTLE_PERSONAL_SKILLS_DIR = '/tmp/some-personal-root';
    try {
      expect(syncSkillLinks(root)).toEqual({ ok: true });
      expect(readFileSync(marker, 'utf8').trim()).toBe(
        '/tmp/some-personal-root',
      );
    } finally {
      if (original === undefined) {
        delete process.env.OPENTHROTTLE_PERSONAL_SKILLS_DIR;
      } else {
        process.env.OPENTHROTTLE_PERSONAL_SKILLS_DIR = original;
      }
    }
  });
});
