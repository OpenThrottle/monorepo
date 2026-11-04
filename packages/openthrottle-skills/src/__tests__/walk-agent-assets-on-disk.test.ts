import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { walkAgentAssetFiles } from '../walk-agent-assets-on-disk.js';

const SKILL_BODY = `---
name: alpha-skill
description: A skill.
---

Skill body
`;

const PERSONA_BODY = `---
name: architect
description: Architecture lens. USE WHEN designing.
---

Persona body
`;

const PROMPT_BODY = `# Before joke

Tell a joke.
`;

describe('walkAgentAssetFiles across all asset kinds', () => {
  let monorepoRoot: string;

  beforeEach(() => {
    monorepoRoot = mkdtempSync(join(tmpdir(), 'ot-skills-walk-all-'));
  });

  afterEach(() => {
    rmSync(monorepoRoot, { force: true, recursive: true });
  });

  test('returns no files and no warnings when every root is missing', () => {
    const { files, warnings } = walkAgentAssetFiles({ monorepoRoot });

    // No `.agents/` tree exists: missing roots are "nothing to walk", not errors.
    expect(files).toEqual([]);
    expect(warnings).toEqual([]);
  });

  test('returns no files for empty asset directories', () => {
    mkdirSync(join(monorepoRoot, '.agents/skills'), { recursive: true });
    mkdirSync(join(monorepoRoot, '.agents/personas'), { recursive: true });
    mkdirSync(join(monorepoRoot, '.agents/prompts'), { recursive: true });

    const { files, warnings } = walkAgentAssetFiles({ monorepoRoot });

    expect(files).toEqual([]);
    expect(warnings).toEqual([]);
  });

  test('walks a symlinked skill directory (ot-skill-sync authored layout)', () => {
    // ot-skill-sync links the authored skills/<slug> dirs into .agents/skills/.
    mkdirSync(join(monorepoRoot, 'skills/linked-skill'), { recursive: true });
    writeFileSync(
      join(monorepoRoot, 'skills/linked-skill/SKILL.md'),
      SKILL_BODY,
    );
    mkdirSync(join(monorepoRoot, '.agents/skills'), { recursive: true });
    symlinkSync(
      join(monorepoRoot, 'skills/linked-skill'),
      join(monorepoRoot, '.agents/skills/linked-skill'),
      'dir',
    );

    const { files, warnings } = walkAgentAssetFiles({ monorepoRoot });

    expect(warnings).toEqual([]);
    expect(files.map((file) => file.slug)).toEqual(['linked-skill']);
    // Resolves under <root>/skills/ — the authored (openthrottle) signal.
    expect(files[0]?.authored).toBe(true);
  });

  test('marks a real (lockfile-installed) skill directory as not authored', () => {
    mkdirSync(join(monorepoRoot, '.agents/skills/installed-skill'), {
      recursive: true,
    });
    writeFileSync(
      join(monorepoRoot, '.agents/skills/installed-skill/SKILL.md'),
      SKILL_BODY,
    );

    const { files } = walkAgentAssetFiles({ monorepoRoot });

    expect(files[0]?.authored).toBe(false);
  });

  test('skips a skill directory symlink escaping the monorepo root', () => {
    const outside = mkdtempSync(join(tmpdir(), 'ot-skills-outside-'));
    mkdirSync(join(outside, 'escapee'), { recursive: true });
    writeFileSync(join(outside, 'escapee/SKILL.md'), SKILL_BODY);
    mkdirSync(join(monorepoRoot, '.agents/skills'), { recursive: true });
    symlinkSync(
      join(outside, 'escapee'),
      join(monorepoRoot, '.agents/skills/escapee'),
      'dir',
    );

    const { files } = walkAgentAssetFiles({ monorepoRoot });

    expect(files).toEqual([]);
    rmSync(outside, { force: true, recursive: true });
  });

  test('skips a broken skill directory symlink without warnings', () => {
    mkdirSync(join(monorepoRoot, '.agents/skills'), { recursive: true });
    symlinkSync(
      join(monorepoRoot, 'skills/gone-skill'),
      join(monorepoRoot, '.agents/skills/gone-skill'),
      'dir',
    );

    const { files, warnings } = walkAgentAssetFiles({ monorepoRoot });

    expect(files).toEqual([]);
    expect(warnings).toEqual([]);
  });

  test('collects skills, personas, and prompts from a synthetic tree', () => {
    mkdirSync(join(monorepoRoot, '.agents/skills/alpha-skill'), {
      recursive: true,
    });
    writeFileSync(
      join(monorepoRoot, '.agents/skills/alpha-skill/SKILL.md'),
      SKILL_BODY,
    );
    mkdirSync(join(monorepoRoot, '.agents/personas'), { recursive: true });
    writeFileSync(
      join(monorepoRoot, '.agents/personas/architect.md'),
      PERSONA_BODY,
    );
    mkdirSync(join(monorepoRoot, '.agents/prompts'), { recursive: true });
    writeFileSync(
      join(monorepoRoot, '.agents/prompts/Before_Joke.md'),
      PROMPT_BODY,
    );
    const { files, warnings } = walkAgentAssetFiles({ monorepoRoot });

    expect(warnings).toEqual([]);
    expect(
      files.map((file) => ({
        kind: file.kind,
        path: file.path,
        slug: file.slug,
      })),
    ).toEqual([
      {
        kind: 'skill',
        path: '.agents/skills/alpha-skill/SKILL.md',
        slug: 'alpha-skill',
      },
      {
        kind: 'persona',
        path: '.agents/personas/architect.md',
        slug: 'architect',
      },
      {
        kind: 'prompt',
        path: '.agents/prompts/Before_Joke.md',
        slug: 'Before_Joke',
      },
    ]);
  });

  test('skips README.md and _template.md in personas and prompts', () => {
    mkdirSync(join(monorepoRoot, '.agents/personas'), { recursive: true });
    writeFileSync(join(monorepoRoot, '.agents/personas/README.md'), '# Readme');
    writeFileSync(
      join(monorepoRoot, '.agents/personas/_template.md'),
      PERSONA_BODY,
    );
    writeFileSync(
      join(monorepoRoot, '.agents/personas/architect.md'),
      PERSONA_BODY,
    );

    const { files } = walkAgentAssetFiles({ monorepoRoot });
    const personaPaths = files
      .filter((file) => file.kind === 'persona')
      .map((file) => file.path);

    expect(personaPaths).toEqual(['.agents/personas/architect.md']);
  });

  test('warns for a skill directory missing its SKILL.md and collects no file', () => {
    mkdirSync(join(monorepoRoot, '.agents/skills/empty-skill'), {
      recursive: true,
    });

    const { files, warnings } = walkAgentAssetFiles({ monorepoRoot });

    // readFileSafely surfaces any read failure (including ENOENT) as a warning,
    // unlike the directory walk which silently treats a missing root as empty.
    expect(files).toEqual([]);
    expect(
      warnings.some(
        (warning) =>
          warning.field === '(filesystem)' &&
          warning.path === '.agents/skills/empty-skill/SKILL.md' &&
          warning.severity === 'warning',
      ),
    ).toBe(true);
  });

  test('surfaces an unreadable skill file as a warning rather than throwing', () => {
    const skillDir = join(monorepoRoot, '.agents/skills/locked-skill');
    mkdirSync(skillDir, { recursive: true });
    const skillPath = join(skillDir, 'SKILL.md');
    writeFileSync(skillPath, SKILL_BODY);
    // Remove all read permission so readFileSync raises EACCES.
    chmodSync(skillPath, 0o000);

    try {
      const { files, warnings } = walkAgentAssetFiles({ monorepoRoot });

      expect(files.some((file) => file.kind === 'skill')).toBe(false);
      expect(
        warnings.some(
          (warning) =>
            warning.field === '(filesystem)' &&
            warning.path === '.agents/skills/locked-skill/SKILL.md' &&
            warning.severity === 'warning',
        ),
      ).toBe(true);
    } finally {
      // Restore permissions so the afterEach cleanup can remove the file.
      chmodSync(skillPath, 0o644);
    }
  });
});
