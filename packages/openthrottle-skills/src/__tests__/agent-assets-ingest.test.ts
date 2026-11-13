import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import type { AgentAssetFileEntry } from '../agent-assets-disk.ts';
import type { AgentAssetIngestRecord } from '../agent-assets-ingest.ts';
import {
  mapAgentAssetFilesToIngestRecords,
  mapAgentAssetFileToIngestRecord,
  toProjectSkillInputs,
} from '../agent-assets-ingest.ts';

const monorepoRoot = join(import.meta.dirname, '../../../..');

describe('mapAgentAssetFileToIngestRecord', () => {
  describe('when kind is skill', () => {
    test('maps skill frontmatter to custom_prompts row', () => {
      const entry: AgentAssetFileEntry = {
        content: `---
name: ot-plans
description: OpenThrottle plans via MCP.
---

# OT plans
`,
        kind: 'skill',
        path: '.agents/skills/ot-plans/SKILL.md',
        slug: 'ot-plans',
      };

      const record = mapAgentAssetFileToIngestRecord(entry);

      expect(record.promptType).toBe('skills');
      expect(record.title).toBe('ot-plans');
      expect(record.description).toBe('OpenThrottle plans via MCP.');
      expect(record.filePath).toBe('.agents/skills/ot-plans/SKILL.md');
      expect(record.labels).toEqual(['ot-plans']);
    });

    test('carries tags and disable-model-invocation when present', () => {
      const entry: AgentAssetFileEntry = {
        content: `---
name: github-commit
description: Commit helper.
disable-model-invocation: true
tags:
  - github
  - git
  - commit
---

# GitHub commit
`,
        kind: 'skill',
        path: '.agents/skills/github-commit/SKILL.md',
        slug: 'github-commit',
      };

      const record = mapAgentAssetFileToIngestRecord(entry);

      expect(record.tags).toEqual(['github', 'git', 'commit']);
      expect(record.disableModelInvocation).toBe(true);
    });

    test('leaves tags and flag undefined when frontmatter omits them', () => {
      const entry: AgentAssetFileEntry = {
        content: `---
name: untagged-skill
description: No tags, no flag.
---

# Untagged
`,
        kind: 'skill',
        path: '.agents/skills/untagged-skill/SKILL.md',
        slug: 'untagged-skill',
      };

      const record = mapAgentAssetFileToIngestRecord(entry);

      expect(record.tags).toBeUndefined();
      expect(record.disableModelInvocation).toBeUndefined();
      // No walker authored flag defaults to a non-authored (external) skill.
      expect(record.authored).toBe(false);
    });

    test('carries the walker authored flag into the record', () => {
      const entry: AgentAssetFileEntry = {
        authored: true,
        content: `---
name: owned-skill
description: We author this one.
---

# Owned
`,
        kind: 'skill',
        path: '.agents/skills/owned-skill/SKILL.md',
        slug: 'owned-skill',
      };

      const record = mapAgentAssetFileToIngestRecord(entry);

      expect(record.authored).toBe(true);
    });

    test('preserves disable-model-invocation false as a distinct value', () => {
      const entry: AgentAssetFileEntry = {
        content: `---
name: agents-ralph
description: Ralph loop.
disable-model-invocation: false
tags: []
---

# Ralph
`,
        kind: 'skill',
        path: '.agents/skills/agents-ralph/SKILL.md',
        slug: 'agents-ralph',
      };

      const record = mapAgentAssetFileToIngestRecord(entry);

      expect(record.disableModelInvocation).toBe(false);
      expect(record.tags).toEqual([]);
    });
  });

  describe('when kind is persona', () => {
    test('maps persona with persona label', () => {
      const entry: AgentAssetFileEntry = {
        content: `---
name: architect
description: Architecture lens. USE WHEN designing modules.
---

# Architect
`,
        kind: 'persona',
        path: '.agents/personas/architect.md',
        slug: 'architect',
      };

      const record = mapAgentAssetFileToIngestRecord(entry);

      expect(record.promptType).toBe('personas');
      expect(record.title).toBe('architect');
      expect(record.labels).toEqual(['persona', 'architect']);
      expect(record.tags).toBeUndefined();
      expect(record.disableModelInvocation).toBeUndefined();
      expect(record.authored).toBeUndefined();
    });
  });

  describe('when kind is prompt', () => {
    test('maps prompt fragment by filename', () => {
      const entry: AgentAssetFileEntry = {
        content: '# Before joke\n\nTell a joke.',
        kind: 'prompt',
        path: '.agents/prompts/Before_Joke.md',
        slug: 'Before_Joke',
      };

      const record = mapAgentAssetFileToIngestRecord(entry);

      expect(record.promptType).toBe('prompts');
      expect(record.title).toBe('Before_Joke');
      expect(record.description).toBeNull();
    });
  });
});

describe('mapAgentAssetFilesToIngestRecords', () => {
  test('maps repo architect persona from disk', () => {
    const architectPath = join(monorepoRoot, '.agents/personas/architect.md');
    const content = readFileSync(architectPath, 'utf8');

    const records = mapAgentAssetFilesToIngestRecords([
      {
        content,
        kind: 'persona',
        path: '.agents/personas/architect.md',
        slug: 'architect',
      },
    ]);

    expect(records[0]?.promptType).toBe('personas');
    expect(records[0]?.title).toBe('architect');
  });
});

const skillRecord = (
  overrides: Partial<AgentAssetIngestRecord>,
): AgentAssetIngestRecord => {
  return {
    authored: false,
    content: '# body',
    description: 'A skill.',
    disableModelInvocation: undefined,
    filePath: '.agents/skills/example/SKILL.md',
    labels: ['example'],
    promptType: 'skills',
    tags: undefined,
    title: 'example',
    ...overrides,
  };
};

describe('toProjectSkillInputs', () => {
  test('projects a tagged skill with its flag and source path', () => {
    const inputs = toProjectSkillInputs([
      skillRecord({
        disableModelInvocation: true,
        filePath: '.agents/skills/github-commit/SKILL.md',
        labels: ['github-commit'],
        tags: ['github', 'commit'],
      }),
    ]);

    expect(inputs).toEqual([
      {
        description: 'A skill.',
        disableModelInvocation: true,
        slug: 'github-commit',
        source: 'external',
        sourcePath: '.agents/skills/github-commit/SKILL.md',
        sourceUrl: undefined,
        tags: ['github', 'commit'],
      },
    ]);
  });

  test('carries the frontmatter description, including a null description', () => {
    const [withDescription] = toProjectSkillInputs([
      skillRecord({ description: 'Does a thing.', labels: ['thing'] }),
    ]);
    expect(withDescription?.description).toBe('Does a thing.');

    const [withoutDescription] = toProjectSkillInputs([
      skillRecord({ description: null, labels: ['bare'] }),
    ]);
    expect(withoutDescription?.description).toBeNull();
  });

  test('derives openthrottle for an authored (symlinked) skill', () => {
    const [input] = toProjectSkillInputs([
      skillRecord({ authored: true, labels: ['owned'] }),
    ]);

    expect(input?.source).toBe('openthrottle');
    expect(input?.sourceUrl).toBeUndefined();
  });

  test('derives external with a lockfile origin URL for an installed skill', () => {
    const [input] = toProjectSkillInputs(
      [skillRecord({ authored: false, labels: ['vendored'] })],
      {
        vendored: { source: 'github/awesome-copilot', sourceType: 'github' },
      },
    );

    expect(input?.source).toBe('external');
    expect(input?.sourceUrl).toBe('https://github.com/github/awesome-copilot');
  });

  test('an authored skill never picks up a lockfile URL', () => {
    const [input] = toProjectSkillInputs(
      [skillRecord({ authored: true, labels: ['owned'] })],
      { owned: { source: 'github/elsewhere', sourceType: 'github' } },
    );

    expect(input?.sourceUrl).toBeUndefined();
  });

  test('an installed skill without a lockfile entry stays external with no URL', () => {
    const [input] = toProjectSkillInputs([
      skillRecord({ authored: false, labels: ['orphan'] }),
    ]);

    expect(input?.source).toBe('external');
    expect(input?.sourceUrl).toBeUndefined();
  });

  test('treats an undefined authored flag as external', () => {
    const [input] = toProjectSkillInputs([
      skillRecord({ authored: undefined, labels: ['legacy'] }),
    ]);

    expect(input?.source).toBe('external');
  });

  test('does not merge overlay maps; frontmatter tags are copied as-is', () => {
    const [input] = toProjectSkillInputs([
      skillRecord({ labels: ['brag-sheet'], tags: undefined }),
    ]);

    expect(input?.tags).toEqual([]);
  });

  test('keeps frontmatter tags without overlay union', () => {
    const [input] = toProjectSkillInputs([
      skillRecord({ labels: ['github-commit'], tags: ['git'] }),
    ]);

    expect(input?.tags).toEqual(['git']);
  });

  test('defaults absent tags to an empty list and preserves unset flag', () => {
    const [input] = toProjectSkillInputs([
      skillRecord({ labels: ['untagged'], tags: undefined }),
    ]);

    expect(input?.tags).toEqual([]);
    expect(input?.disableModelInvocation).toBeUndefined();
  });

  test('preserves an explicit false flag distinct from unset', () => {
    const [input] = toProjectSkillInputs([
      skillRecord({ disableModelInvocation: false, labels: ['ralph'] }),
    ]);

    expect(input?.disableModelInvocation).toBe(false);
  });

  test('drops non-skill records and skills without a slug', () => {
    const inputs = toProjectSkillInputs([
      skillRecord({ labels: ['kept'] }),
      skillRecord({ labels: [] }),
      {
        authored: undefined,
        content: 'persona',
        description: null,
        disableModelInvocation: undefined,
        filePath: '.agents/personas/architect.md',
        labels: ['persona', 'architect'],
        promptType: 'personas',
        tags: undefined,
        title: 'architect',
      },
    ]);

    expect(inputs.map((input) => input.slug)).toEqual(['kept']);
  });
});
