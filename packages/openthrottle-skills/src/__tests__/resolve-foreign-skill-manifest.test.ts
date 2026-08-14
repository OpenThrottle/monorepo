import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { discoverSkillDirs } from '../discover-skill-dirs.ts';
import {
  FOREIGN_SKILL_LAYER,
  resolveForeignSkillManifest,
} from '../resolve-foreign-skill-manifest.ts';

const skillMd = (name: string, description = `The ${name} skill`): string =>
  `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`;

/** Writes a valid skill directory (`<root>/<name>/SKILL.md`) under `root`. */
const writeSkill = (root: string, name: string, description?: string): void => {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), skillMd(name, description));
};

describe('resolveForeignSkillManifest', () => {
  let base: string;
  let otDir: string;
  let personalDir: string;

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'ot-foreign-skill-'));
    otDir = join(base, 'ot', 'skills');
    personalDir = join(base, 'personal', 'skills');
    mkdirSync(otDir, { recursive: true });
    mkdirSync(personalDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(base, { force: true, recursive: true });
  });

  test('OT curated only, sorted, when personal dir is unset', () => {
    writeSkill(otDir, 'ot-plans');
    writeSkill(otDir, 'create-readme');
    writeSkill(otDir, 'nx-generate');

    const { entries, warnings } = resolveForeignSkillManifest({
      otCuratedSkillsDir: otDir,
    });

    expect(warnings).toEqual([]);
    expect(entries.map((entry) => entry.name)).toEqual([
      'create-readme',
      'nx-generate',
      'ot-plans',
    ]);
    expect(
      entries.every((entry) => entry.layer === FOREIGN_SKILL_LAYER.otCurated),
    ).toBe(true);
    expect(entries[0]?.sourcePath).toBe(join(otDir, 'create-readme'));
  });

  test('empty-string personal dir is a clean no-op (OT curated only)', () => {
    writeSkill(otDir, 'ot-plans');

    const { entries } = resolveForeignSkillManifest({
      otCuratedSkillsDir: otDir,
      personalSkillsDir: '',
    });

    expect(entries.map((entry) => entry.name)).toEqual(['ot-plans']);
    expect(entries[0]?.layer).toBe(FOREIGN_SKILL_LAYER.otCurated);
  });

  test('personal overrides OT curated on a name collision', () => {
    writeSkill(otDir, 'ot-plans');
    writeSkill(otDir, 'shared-skill', 'ot version');
    writeSkill(personalDir, 'shared-skill', 'personal version');
    writeSkill(personalDir, 'my-spike');

    const { entries } = resolveForeignSkillManifest({
      otCuratedSkillsDir: otDir,
      personalSkillsDir: personalDir,
    });

    const byName = new Map(entries.map((entry) => [entry.name, entry]));
    expect(byName.get('shared-skill')?.layer).toBe(
      FOREIGN_SKILL_LAYER.personal,
    );
    expect(byName.get('shared-skill')?.sourcePath).toBe(
      join(personalDir, 'shared-skill'),
    );
    expect(byName.get('ot-plans')?.layer).toBe(FOREIGN_SKILL_LAYER.otCurated);
    expect(byName.get('my-spike')?.layer).toBe(FOREIGN_SKILL_LAYER.personal);
  });

  test('target repo wins: names it owns are dropped across all layers', () => {
    // create-readme is present in BOTH injected layers AND the target repo.
    writeSkill(otDir, 'create-readme', 'ot version');
    writeSkill(otDir, 'ot-plans');
    writeSkill(personalDir, 'create-readme', 'personal version');
    writeSkill(personalDir, 'deploy-prod');

    const { entries } = resolveForeignSkillManifest({
      otCuratedSkillsDir: otDir,
      personalSkillsDir: personalDir,
      targetRepoSkillNames: ['create-readme', 'deploy-prod'],
    });

    const names = entries.map((entry) => entry.name);
    expect(names).not.toContain('create-readme');
    expect(names).not.toContain('deploy-prod');
    expect(names).toEqual(['ot-plans']);
  });

  test('malformed personal skill is skipped with a warning, valid ones kept', () => {
    writeSkill(otDir, 'ot-plans');
    writeSkill(personalDir, 'good-skill');
    // Missing required `description` → schema failure → skipped + warned.
    const badDir = join(personalDir, 'bad-skill');
    mkdirSync(badDir, { recursive: true });
    writeFileSync(
      join(badDir, 'SKILL.md'),
      `---\nname: bad-skill\n---\n\nbody\n`,
    );

    const { entries, warnings } = resolveForeignSkillManifest({
      otCuratedSkillsDir: otDir,
      personalSkillsDir: personalDir,
    });

    expect(entries.map((entry) => entry.name)).toEqual([
      'good-skill',
      'ot-plans',
    ]);
    expect(warnings.some((warning) => warning.includes('bad-skill'))).toBe(
      true,
    );
  });

  test('missing OT curated root yields an empty manifest, no warning', () => {
    const { entries, warnings } = resolveForeignSkillManifest({
      otCuratedSkillsDir: join(base, 'does-not-exist'),
    });

    expect(entries).toEqual([]);
    expect(warnings).toEqual([]);
  });
});

describe('discoverSkillDirs', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'ot-discover-'));
  });

  afterEach(() => {
    rmSync(root, { force: true, recursive: true });
  });

  test('a directory without SKILL.md is skipped quietly', () => {
    mkdirSync(join(root, 'not-a-skill'), { recursive: true });
    writeSkill(root, 'real-skill');

    const { skills, warnings } = discoverSkillDirs(root);

    expect(skills.map((skill) => skill.name)).toEqual(['real-skill']);
    expect(warnings).toEqual([]);
  });

  test('missing root is an empty result with no warning', () => {
    const { skills, warnings } = discoverSkillDirs(join(root, 'nope'));

    expect(skills).toEqual([]);
    expect(warnings).toEqual([]);
  });
});
