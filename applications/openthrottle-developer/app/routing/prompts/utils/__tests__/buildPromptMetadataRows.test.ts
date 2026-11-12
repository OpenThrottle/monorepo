import { describe, expect, test } from 'vitest';

import type { PromptDetailsFragment } from '~/__generated__/graphql';
import { CustomPromptType } from '~/__generated__/graphql';

import { buildPromptMetadataRows } from '../buildPromptMetadataRows';

const customPrompt = (
  overrides: Partial<PromptDetailsFragment> = {},
): PromptDetailsFragment => {
  return {
    __typename: 'CustomPromptObject',
    content: 'hello world',
    createdAt: '2025-01-01T00:00:00Z',
    description: null,
    filePath: null,
    id: 'prompt-1',
    labels: [],
    projectId: null,
    promptType: CustomPromptType.Prompts,
    title: 'My Prompt',
    updatedAt: '2025-01-02T00:00:00Z',
    userId: null,
    ...overrides,
  };
};

const labelsOf = (rows: readonly { readonly label: string }[]): string[] => {
  return rows.map((row) => row.label);
};

describe('buildPromptMetadataRows', () => {
  describe('base rows', () => {
    test('always includes the id, type, labels and content rows', () => {
      const prompt = customPrompt();
      const rows = buildPromptMetadataRows({
        contentLength: 1234,
        debugContent: prompt.content,
        prompt,
      });

      expect(labelsOf(rows)).toEqual([
        'Prompt ID',
        'promptType',
        'Labels',
        'Created',
        'Created (relative)',
        'Updated',
        'Updated (relative)',
        'Content length',
        'Content fingerprint (FNV-1a)',
      ]);
      expect(rows.find((row) => row.label === 'Labels')?.value).toBe('(none)');
    });
  });

  describe('optional rows', () => {
    test('adds description, filePath, projectId and userId when present', () => {
      const prompt = customPrompt({
        description: 'desc',
        filePath: 'a/b.md',
        projectId: 'proj',
        userId: 'user',
      });
      const rows = buildPromptMetadataRows({
        contentLength: 1,
        debugContent: prompt.content,
        prompt,
      });

      expect(labelsOf(rows)).toEqual(
        expect.arrayContaining([
          'Description',
          'filePath (repo)',
          'projectId',
          'userId',
        ]),
      );
    });

    test('adds the saved fingerprint only when the buffer differs', () => {
      const prompt = customPrompt();
      const clean = buildPromptMetadataRows({
        contentLength: 1,
        debugContent: prompt.content,
        prompt,
      });
      const dirty = buildPromptMetadataRows({
        contentLength: 1,
        debugContent: 'edited',
        prompt,
      });

      expect(labelsOf(clean)).not.toContain('Saved fingerprint (API)');
      expect(labelsOf(dirty)).toContain('Saved fingerprint (API)');
    });
  });
});
