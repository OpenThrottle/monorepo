import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  mapAgentAssetFileToIngestRecord,
  mapAgentAssetFilesToIngestRecords,
} from '../map-agent-assets-for-ingest.ts';
import type { AgentAssetFileEntry } from '../walk-agent-assets-on-disk.ts';

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

  describe('when kind is rule', () => {
    test('adds coding label from rule path', () => {
      const entry: AgentAssetFileEntry = {
        content: `---
description: No default exports
globs: **/*.ts
---

Rule body
`,
        kind: 'rule',
        path: '.agents/rules/coding/default-exports.mdc',
        slug: undefined,
      };

      const record = mapAgentAssetFileToIngestRecord(entry);

      expect(record.promptType).toBe('rules');
      expect(record.title).toBe('default-exports');
      expect(record.labels).toEqual(['coding']);
    });

    test('adds commands label from rule path', () => {
      const entry: AgentAssetFileEntry = {
        content: `---
description: A command rule
globs: **/*.ts
---

Rule body
`,
        kind: 'rule',
        path: '.agents/rules/commands/release.mdc',
        slug: undefined,
      };

      const record = mapAgentAssetFileToIngestRecord(entry);

      expect(record.labels).toEqual(['commands']);
    });

    test('emits no labels for a rule outside coding/ and commands/', () => {
      const entry: AgentAssetFileEntry = {
        content: `---
description: A general rule
---

Rule body
`,
        kind: 'rule',
        path: '.agents/rules/general.mdc',
        slug: undefined,
      };

      const record = mapAgentAssetFileToIngestRecord(entry);

      expect(record.labels).toEqual([]);
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
