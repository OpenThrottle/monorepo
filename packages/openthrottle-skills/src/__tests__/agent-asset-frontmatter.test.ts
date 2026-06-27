// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  parsePersonaFrontmatter,
  parseRuleFrontmatter,
  parseSkillFrontmatter,
  validateAgentAssetFrontmatter,
  validateAgentAssetsOnDisk,
  walkAgentAssetFiles,
} from '../index.ts';

const monorepoRoot = join(import.meta.dirname, '../../../..');

describe('parseSkillFrontmatter', () => {
  test('returns undefined fields when file has no frontmatter block', () => {
    expect(
      parseSkillFrontmatter('# Skill title\n\nBody without frontmatter.\n'),
    ).toEqual({
      description: undefined,
      disableModelInvocation: undefined,
      name: undefined,
    });
  });

  test('parses inline name, description, and disable-model-invocation', () => {
    expect(
      parseSkillFrontmatter(`---
name: my-skill
description: Short one-line summary.
disable-model-invocation: true
---
`),
    ).toEqual({
      description: 'Short one-line summary.',
      disableModelInvocation: true,
      name: 'my-skill',
    });
  });

  test('parses folded multiline description (>-)', () => {
    expect(
      parseSkillFrontmatter(`---
name: folded-skill
description: >-
  First line of the summary.
  Second line of the summary.
---
`),
    ).toEqual({
      description: 'First line of the summary. Second line of the summary.',
      disableModelInvocation: undefined,
      name: 'folded-skill',
    });
  });

  test('parses real openthrottle-generators SKILL.md frontmatter', () => {
    const content = readFileSync(
      join(monorepoRoot, '.agents/skills/openthrottle-generators/SKILL.md'),
      'utf8',
    );

    const result = parseSkillFrontmatter(content);

    expect(result.name).toBe('openthrottle-generators');
    expect(result.description).toContain('@tools/generators');
  });
});

describe('parseRuleFrontmatter', () => {
  test('parses alwaysApply and empty description/globs', () => {
    expect(
      parseRuleFrontmatter(`---
description:
globs:
alwaysApply: true
---
`),
    ).toEqual({
      alwaysApply: true,
      description: undefined,
      globs: undefined,
    });
  });
});

describe('parsePersonaFrontmatter', () => {
  test('parses architect persona frontmatter', () => {
    const content = readFileSync(
      join(monorepoRoot, '.agents/personas/architect.md'),
      'utf8',
    );

    const result = parsePersonaFrontmatter(content);

    expect(result.name).toBe('architect');
    expect(result.description).toContain('USE WHEN');
  });
});

describe('validateAgentAssetFrontmatter', () => {
  test('hard-fails skill missing description', () => {
    const result = validateAgentAssetFrontmatter({
      content: `---
name: bad-skill
---
`,
      expectedSlug: 'bad-skill',
      kind: 'skill',
      path: '.agents/skills/bad-skill/SKILL.md',
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.warnings).toHaveLength(0);
  });

  test('warn-only for rule with empty description', () => {
    const result = validateAgentAssetFrontmatter({
      content: `---
description:
globs:
alwaysApply: true
---
`,
      kind: 'rule',
      path: '.agents/rules/coding/example.mdc',
    });

    expect(result.errors).toHaveLength(0);
    expect(result.warnings.some((w) => w.field === 'description')).toBe(true);
  });

  test('warns when skill disable-model-invocation is a non-boolean value', () => {
    const result = validateAgentAssetFrontmatter({
      content: `---
name: yes-skill
description: Valid description with enough content.
disable-model-invocation: yes
---
`,
      expectedSlug: 'yes-skill',
      kind: 'skill',
      path: '.agents/skills/yes-skill/SKILL.md',
    });

    expect(
      result.warnings.some((w) => w.field === 'disable-model-invocation'),
    ).toBe(true);
  });

  test('hard-fails skill when name does not match directory slug', () => {
    const result = validateAgentAssetFrontmatter({
      content: `---
name: wrong-slug
description: Valid description with enough content.
---
`,
      expectedSlug: 'expected-slug',
      kind: 'skill',
      path: '.agents/skills/expected-slug/SKILL.md',
    });

    expect(
      result.errors.some(
        (e) =>
          e.field === 'name' &&
          e.message.includes('must match directory slug "expected-slug"'),
      ),
    ).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  test('hard-fails persona when name does not match filename id', () => {
    const result = validateAgentAssetFrontmatter({
      content: `---
name: wrong-id
description: Valid description with enough content.
---
`,
      expectedSlug: 'architect',
      kind: 'persona',
      path: '.agents/personas/architect.md',
    });

    expect(result.errors.some((e) => e.field === 'name')).toBe(true);
  });
});

describe('validateAgentAssetsOnDisk', () => {
  test('validates current repo SSOT without hard failures', () => {
    const { errors } = validateAgentAssetsOnDisk({ monorepoRoot });

    expect(errors).toEqual([]);
  });
});

describe('walkAgentAssetFiles', () => {
  test('returns no files and does not throw when roots are missing', () => {
    const missingRoot = join(monorepoRoot, 'does-not-exist-on-disk-xyz');

    const { files, warnings } = walkAgentAssetFiles({
      monorepoRoot: missingRoot,
    });

    expect(files).toEqual([]);
    // Missing dirs use throwIfNoEntry:false and yield no warnings (not an error).
    expect(warnings).toEqual([]);
  });
});
