import { describe, expect, test } from 'vitest';
import { CustomPromptType } from '~/__generated__/graphql';
import type { GetPromptQuery } from '~/__generated__/graphql';
import { buildPromptDebugSnapshotJson } from '../prompt-debug-snapshot';

type CustomPrompt = NonNullable<GetPromptQuery['customPrompt']>;

const customPrompt = (overrides: Partial<CustomPrompt> = {}): CustomPrompt => ({
  __typename: 'CustomPromptObject',
  content: 'hello world',
  createdAt: '2025-01-01T00:00:00Z',
  description: null,
  filePath: null,
  id: 'prompt-1',
  labels: ['alpha', 'beta'],
  projectId: null,
  promptType: CustomPromptType.Prompts,
  title: 'My Prompt',
  updatedAt: '2025-01-02T00:00:00Z',
  userId: null,
  ...overrides,
});

describe('buildPromptDebugSnapshotJson', () => {
  test('produces a stable, alphabetized JSON snapshot when buffer matches saved content', () => {
    const prompt = customPrompt();
    const json = buildPromptDebugSnapshotJson(prompt, prompt.content);
    const parsed: unknown = JSON.parse(json);

    expect(parsed).toEqual({
      contentFingerprint: expect.any(String),
      createdAt: prompt.createdAt,
      filePath: null,
      hasUnsavedEditorBuffer: false,
      labels: ['alpha', 'beta'],
      projectId: null,
      promptId: 'prompt-1',
      promptType: 'PROMPTS',
      savedContentFingerprint: expect.any(String),
      title: 'My Prompt',
      updatedAt: prompt.updatedAt,
      userId: null,
    });
  });

  test('flags hasUnsavedEditorBuffer when the debug buffer differs from saved content', () => {
    const prompt = customPrompt();
    const json = buildPromptDebugSnapshotJson(prompt, 'edited content');
    const { hasUnsavedEditorBuffer } = JSON.parse(json);

    expect(hasUnsavedEditorBuffer).toBe(true);
  });

  test('produces the same fingerprint for identical content', () => {
    const prompt = customPrompt({ content: 'same text' });
    const json = buildPromptDebugSnapshotJson(prompt, 'same text');
    const { contentFingerprint, savedContentFingerprint } = JSON.parse(json);

    expect(contentFingerprint).toBe(savedContentFingerprint);
  });

  test('falls back to null for missing optional fields', () => {
    const prompt = customPrompt({
      filePath: undefined,
      projectId: undefined,
      userId: undefined,
    });
    const json = buildPromptDebugSnapshotJson(prompt, prompt.content);
    const { filePath, projectId, userId } = JSON.parse(json);

    expect(filePath).toBeNull();
    expect(projectId).toBeNull();
    expect(userId).toBeNull();
  });
});
