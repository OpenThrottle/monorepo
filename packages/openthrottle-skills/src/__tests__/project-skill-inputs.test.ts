import { describe, expect, test } from 'vitest';

import type { AgentAssetIngestRecord } from '../map-agent-assets-for-ingest.ts';
import { toProjectSkillInputs } from '../project-skill-inputs.ts';

const skillRecord = (
  overrides: Partial<AgentAssetIngestRecord>,
): AgentAssetIngestRecord => ({
  content: '# body',
  description: 'A skill.',
  disableModelInvocation: undefined,
  filePath: '.agents/skills/example/SKILL.md',
  labels: ['example'],
  promptType: 'skills',
  tags: undefined,
  title: 'example',
  ...overrides,
});

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
        disableModelInvocation: true,
        slug: 'github-commit',
        sourcePath: '.agents/skills/github-commit/SKILL.md',
        tags: ['github', 'commit'],
      },
    ]);
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
