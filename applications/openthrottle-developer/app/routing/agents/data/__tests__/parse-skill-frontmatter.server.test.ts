// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { parseSkillFrontmatter } from '~/routing/agents/data/parse-skill-frontmatter.server';

const monorepoRoot = join(import.meta.dirname, '../../../../../../..');

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

  test('returns undefined fields when opening --- has no closing delimiter', () => {
    expect(parseSkillFrontmatter('---\nname: orphan\n')).toEqual({
      description: undefined,
      disableModelInvocation: undefined,
      name: undefined,
    });
  });

  test('parses inline name and description scalars', () => {
    expect(
      parseSkillFrontmatter(`---
name: my-skill
description: Short one-line summary.
---

# my-skill
`),
    ).toEqual({
      description: 'Short one-line summary.',
      disableModelInvocation: undefined,
      name: 'my-skill',
    });
  });

  test('parses quoted scalar values', () => {
    expect(
      parseSkillFrontmatter(`---
name: "quoted-name"
description: 'Single-quoted summary.'
---
`),
    ).toEqual({
      description: 'Single-quoted summary.',
      disableModelInvocation: undefined,
      name: 'quoted-name',
    });
  });

  test('returns undefined for missing name and description keys', () => {
    expect(
      parseSkillFrontmatter(`---
license: MIT
---
`),
    ).toEqual({
      description: undefined,
      disableModelInvocation: undefined,
      name: undefined,
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

  test('parses folded multiline description (>)', () => {
    expect(
      parseSkillFrontmatter(`---
name: folded-plain
description: >
  Line one.
  Line two.
---
`),
    ).toEqual({
      description: 'Line one. Line two.',
      disableModelInvocation: undefined,
      name: 'folded-plain',
    });
  });

  test('parses literal multiline description (|-)', () => {
    expect(
      parseSkillFrontmatter(`---
name: literal-skill
description: |-
  Line one.
  Line two.
---
`),
    ).toEqual({
      description: 'Line one.\nLine two.',
      disableModelInvocation: undefined,
      name: 'literal-skill',
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
    expect(result.description).toContain('NX_ISOLATE_PLUGINS=false');
  });

  test('parses real brag-sheet SKILL.md folded description', () => {
    const content = readFileSync(
      join(monorepoRoot, '.agents/skills/brag-sheet/SKILL.md'),
      'utf8',
    );

    const result = parseSkillFrontmatter(content);

    expect(result.name).toBe('brag-sheet');
    expect(result.description).toContain('evidence-backed impact statements');
  });
});
