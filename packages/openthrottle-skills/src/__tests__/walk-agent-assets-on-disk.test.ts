import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { walkAgentAssetFiles } from '../walk-agent-assets-on-disk.js';

const RULE_BODY = `---
description: A rule
---

Rule body
`;

describe('walkAgentAssetFiles rule walk', () => {
  let monorepoRoot: string;
  let rulesRoot: string;

  beforeEach(() => {
    monorepoRoot = mkdtempSync(join(tmpdir(), 'ot-skills-walk-'));
    rulesRoot = join(monorepoRoot, '.agents/rules');
    mkdirSync(rulesRoot, { recursive: true });
  });

  afterEach(() => {
    rmSync(monorepoRoot, { force: true, recursive: true });
  });

  test('collects nested .mdc rule files', () => {
    mkdirSync(join(rulesRoot, 'coding'), { recursive: true });
    writeFileSync(join(rulesRoot, 'coding/default-exports.mdc'), RULE_BODY);

    const result = walkAgentAssetFiles({ monorepoRoot });
    const rulePaths = result.files
      .filter((file) => file.kind === 'rule')
      .map((file) => file.path);

    expect(rulePaths).toEqual(['.agents/rules/coding/default-exports.mdc']);
  });

  test('does not recurse infinitely on a symlinked directory cycle', () => {
    const nested = join(rulesRoot, 'nested');
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(nested, 'real.mdc'), RULE_BODY);
    // nested/loop -> rulesRoot, which would recurse forever without a guard.
    symlinkSync(rulesRoot, join(nested, 'loop'), 'dir');

    const result = walkAgentAssetFiles({ monorepoRoot });
    const rulePaths = result.files
      .filter((file) => file.kind === 'rule')
      .map((file) => file.path);

    // The real file is collected exactly once; the cycle is not followed.
    expect(rulePaths).toEqual(['.agents/rules/nested/real.mdc']);
  });

  test('does not ingest content from a symlink pointing outside .agents', () => {
    const outside = join(monorepoRoot, 'outside');
    mkdirSync(outside, { recursive: true });
    writeFileSync(join(outside, 'leaked.mdc'), RULE_BODY);
    // .agents/rules/escape -> ../../outside (out-of-tree content).
    symlinkSync(outside, join(rulesRoot, 'escape'), 'dir');

    const result = walkAgentAssetFiles({ monorepoRoot });
    const rulePaths = result.files
      .filter((file) => file.kind === 'rule')
      .map((file) => file.path);

    expect(rulePaths).toEqual([]);
  });

  test('does not ingest a symlinked .mdc file pointing outside .agents', () => {
    const outside = join(monorepoRoot, 'outside');
    mkdirSync(outside, { recursive: true });
    writeFileSync(join(outside, 'leaked.mdc'), RULE_BODY);
    symlinkSync(
      join(outside, 'leaked.mdc'),
      join(rulesRoot, 'leaked.mdc'),
      'file',
    );

    const result = walkAgentAssetFiles({ monorepoRoot });
    const rulePaths = result.files
      .filter((file) => file.kind === 'rule')
      .map((file) => file.path);

    expect(rulePaths).toEqual([]);
  });
});

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
    mkdirSync(join(monorepoRoot, '.agents/rules'), { recursive: true });

    const { files, warnings } = walkAgentAssetFiles({ monorepoRoot });

    expect(files).toEqual([]);
    expect(warnings).toEqual([]);
  });

  test('collects skills, personas, prompts, and rules from a synthetic tree', () => {
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
    mkdirSync(join(monorepoRoot, '.agents/rules/coding'), { recursive: true });
    writeFileSync(
      join(monorepoRoot, '.agents/rules/coding/default-exports.mdc'),
      RULE_BODY,
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
        kind: 'rule',
        path: '.agents/rules/coding/default-exports.mdc',
        slug: undefined,
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

  test('skips the nx-rules.mdc rule file', () => {
    mkdirSync(join(monorepoRoot, '.agents/rules'), { recursive: true });
    writeFileSync(join(monorepoRoot, '.agents/rules/nx-rules.mdc'), RULE_BODY);
    writeFileSync(join(monorepoRoot, '.agents/rules/keep.mdc'), RULE_BODY);

    const { files } = walkAgentAssetFiles({ monorepoRoot });
    const rulePaths = files
      .filter((file) => file.kind === 'rule')
      .map((file) => file.path);

    expect(rulePaths).toEqual(['.agents/rules/keep.mdc']);
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
