// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  isAllowedSkillPath,
  isPathInsidePersonalSkillsRoot,
  isPathInsideRoot,
} from '~/routing/agents/data/skill-path-allowlist.server';

const PERSONAL_DIR_ENV = 'OPENTHROTTLE_PERSONAL_SKILLS_DIR';

const tempDirs: string[] = [];

const makeTempDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'ot-skill-allowlist-'));
  tempDirs.push(dir);
  return dir;
};

const makeSkillFile = (root: string, slug: string): string => {
  const skillDir = join(root, slug);
  mkdirSync(skillDir, { recursive: true });
  const skillPath = join(skillDir, 'SKILL.md');
  writeFileSync(skillPath, `---\nname: ${slug}\ndescription: A skill.\n---\n`);
  return skillPath;
};

describe('skill path allowlist', () => {
  let originalPersonalDir: string | undefined;

  beforeEach(() => {
    originalPersonalDir = process.env[PERSONAL_DIR_ENV];
  });

  afterEach(() => {
    if (originalPersonalDir === undefined) {
      delete process.env[PERSONAL_DIR_ENV];
    } else {
      process.env[PERSONAL_DIR_ENV] = originalPersonalDir;
    }
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        rmSync(dir, { force: true, recursive: true });
      }
    }
  });

  test('allows a path inside the monorepo root', () => {
    const root = makeTempDir();
    const skillPath = makeSkillFile(join(root, 'skills'), 'authored');

    expect(isPathInsideRoot(root, skillPath)).toBe(true);
    expect(isAllowedSkillPath(root, skillPath)).toBe(true);
  });

  test('allows a path under the configured personal skills root', () => {
    const root = makeTempDir();
    const personalRoot = makeTempDir();
    process.env[PERSONAL_DIR_ENV] = personalRoot;
    const skillPath = makeSkillFile(personalRoot, 'my-draft');

    expect(isPathInsideRoot(root, skillPath)).toBe(false);
    expect(isPathInsidePersonalSkillsRoot(skillPath)).toBe(true);
    expect(isAllowedSkillPath(root, skillPath)).toBe(true);
  });

  test('refuses a path under some other outside directory', () => {
    const root = makeTempDir();
    const personalRoot = makeTempDir();
    const rogueRoot = makeTempDir();
    process.env[PERSONAL_DIR_ENV] = personalRoot;
    const skillPath = makeSkillFile(rogueRoot, 'rogue');

    expect(isPathInsidePersonalSkillsRoot(skillPath)).toBe(false);
    expect(isAllowedSkillPath(root, skillPath)).toBe(false);
  });

  test('refuses a dangling or unresolvable path', () => {
    const root = makeTempDir();
    const personalRoot = makeTempDir();
    process.env[PERSONAL_DIR_ENV] = personalRoot;

    expect(isAllowedSkillPath(root, join(root, 'nope/SKILL.md'))).toBe(false);
    expect(isAllowedSkillPath(root, join(personalRoot, 'nope/SKILL.md'))).toBe(
      false,
    );
  });

  test('refuses everything outside the repo when no personal root exists', () => {
    const root = makeTempDir();
    const outsideRoot = makeTempDir();
    process.env[PERSONAL_DIR_ENV] = join(outsideRoot, 'absent-personal-root');
    const skillPath = makeSkillFile(outsideRoot, 'stray');

    expect(isAllowedSkillPath(root, skillPath)).toBe(false);
  });

  test('the root itself is not inside itself', () => {
    const root = makeTempDir();

    expect(isPathInsideRoot(root, root)).toBe(false);
  });
});
