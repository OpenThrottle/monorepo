// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  parsePersonaFrontmatter,
  parseSkillFrontmatter,
  parseSkillFrontmatterForValidation,
  validateAgentAssetFrontmatter,
  validateAgentAssetsOnDisk,
  walkAgentAssetFiles,
} from '../index.ts';

const monorepoRoot = join(import.meta.dirname, '../../../..');

describe('parseSkillFrontmatter', () => {
  describe('metadata.outcome-telemetry', () => {
    test('reads none from the nested metadata block', () => {
      const result = parseSkillFrontmatter(`---
name: quiet-skill
description: A reference with no finish line.
metadata:
  author: openthrottle
  # A comment between keys does not hide the value.
  outcome-telemetry: 'none'
---
`);

      expect(result.outcomeTelemetry).toBe('none');
    });

    test('is undefined when metadata has no outcome-telemetry key', () => {
      const result = parseSkillFrontmatter(`---
name: loud-skill
description: Reports its outcome.
metadata:
  author: openthrottle
---
`);

      expect(result.outcomeTelemetry).toBeUndefined();
    });

    test('ignores an unrecognized value', () => {
      const result = parseSkillFrontmatter(`---
name: odd-skill
description: Declares a value nobody knows.
metadata:
  outcome-telemetry: sometimes
---
`);

      expect(result.outcomeTelemetry).toBeUndefined();
    });

    test('ignores a top-level outcome-telemetry key outside metadata', () => {
      const result = parseSkillFrontmatter(`---
name: misplaced-skill
description: Puts the key at the wrong level.
outcome-telemetry: none
---
`);

      expect(result.outcomeTelemetry).toBeUndefined();
    });
  });

  test('returns undefined fields when file has no frontmatter block', () => {
    expect(
      parseSkillFrontmatter('# Skill title\n\nBody without frontmatter.\n'),
    ).toEqual({
      description: undefined,
      disableModelInvocation: undefined,
      name: undefined,
      outcomeTelemetry: undefined,
      tags: undefined,
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
      outcomeTelemetry: undefined,
      tags: undefined,
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
      outcomeTelemetry: undefined,
      tags: undefined,
    });
  });

  test('threads a flow-sequence tags array into ParsedSkillFrontmatter', () => {
    const result = parseSkillFrontmatter(`---
name: tagged-skill
description: Has tags.
tags: [github, git, pr-review]
---
`);

    expect(result.tags).toEqual(['github', 'git', 'pr-review']);
  });

  test('threads a block-sequence tags array into ParsedSkillFrontmatter', () => {
    const result = parseSkillFrontmatter(`---
name: tagged-skill
description: Has tags.
tags:
  - github
  - git
  - pr-review
---
`);

    expect(result.tags).toEqual(['github', 'git', 'pr-review']);
  });

  test('threads an empty tags array into ParsedSkillFrontmatter', () => {
    const result = parseSkillFrontmatter(`---
name: tagged-skill
description: Has tags.
tags: []
---
`);

    expect(result.tags).toEqual([]);
  });

  test('yields undefined tags when the frontmatter key is absent', () => {
    const result = parseSkillFrontmatter(`---
name: untagged-skill
description: No tags key.
---
`);

    expect(result.tags).toBeUndefined();
  });

  test('yields undefined tags when the frontmatter value is a scalar, not a sequence', () => {
    const result = parseSkillFrontmatter(`---
name: scalar-tags-skill
description: tags is a scalar, not a list.
tags: github
---
`);

    expect(result.tags).toBeUndefined();
  });

  test('parses real ot-generators SKILL.md frontmatter', () => {
    const content = readFileSync(
      join(monorepoRoot, 'skills/ot-generators/SKILL.md'),
      'utf8',
    );

    const result = parseSkillFrontmatter(content);

    expect(result.name).toBe('ot-generators');
    expect(result.description).toContain('@tools/generators');
  });
});

describe('parseSkillFrontmatterForValidation tags pass-through', () => {
  test('passes a tags array through raw for Zod to validate', () => {
    const result = parseSkillFrontmatterForValidation(`---
name: tagged-skill
description: Has tags.
tags: [github, git]
---
`);

    expect(result.tags).toEqual(['github', 'git']);
  });

  test('omits tags entirely when the frontmatter key is absent', () => {
    const result = parseSkillFrontmatterForValidation(`---
name: untagged-skill
description: No tags key.
---
`);

    expect('tags' in result).toBe(false);
  });

  test('passes a scalar tags value through raw so Zod rejects the wrong shape', () => {
    const result = parseSkillFrontmatterForValidation(`---
name: scalar-tags-skill
description: tags is a scalar, not a list.
tags: github
---
`);

    expect(result.tags).toBe('github');
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

  test('warns when metadata.outcome-telemetry is an unrecognized value', () => {
    const result = validateAgentAssetFrontmatter({
      content: `---
name: odd-skill
description: Valid description with enough content.
metadata:
  outcome-telemetry: sometimes
---
`,
      expectedSlug: 'odd-skill',
      kind: 'skill',
      path: '.agents/skills/odd-skill/SKILL.md',
    });

    expect(result.errors).toHaveLength(0);
    expect(
      result.warnings.some((w) => w.field === 'metadata.outcome-telemetry'),
    ).toBe(true);
  });

  test('accepts metadata.outcome-telemetry none without a warning', () => {
    const result = validateAgentAssetFrontmatter({
      content: `---
name: quiet-skill
description: Valid description with enough content.
metadata:
  outcome-telemetry: 'none'
---
`,
      expectedSlug: 'quiet-skill',
      kind: 'skill',
      path: '.agents/skills/quiet-skill/SKILL.md',
    });

    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
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
