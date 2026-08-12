import { describe, expect, test } from 'vitest';

import type { AgentAssetIngestRecord } from '../map-agent-assets-for-ingest.ts';
import { toProjectSkillInputs } from '../project-skill-inputs.ts';

const skillRecord = (
  overrides: Partial<AgentAssetIngestRecord>,
): AgentAssetIngestRecord => ({
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
      undefined,
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
      undefined,
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

  test('merges overlay tags (order-preserving union) when overlays are supplied', () => {
    const [input] = toProjectSkillInputs(
      [skillRecord({ labels: ['brag-sheet'], tags: undefined })],
      { 'brag-sheet': { tags: ['docs', 'git', 'github'] } },
    );

    expect(input?.tags).toEqual(['docs', 'git', 'github']);
  });

  test('overlay union dedupes against frontmatter tags', () => {
    const [input] = toProjectSkillInputs(
      [skillRecord({ labels: ['github-commit'], tags: ['git'] })],
      { 'github-commit': { tags: ['git', 'github'] } },
    );

    expect(input?.tags).toEqual(['git', 'github']);
  });

  test('a skill absent from the overlay map keeps its frontmatter tags', () => {
    const [input] = toProjectSkillInputs(
      [skillRecord({ labels: ['loner'], tags: ['nx'] })],
      { 'other-skill': { tags: ['docs'] } },
    );

    expect(input?.tags).toEqual(['nx']);
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
