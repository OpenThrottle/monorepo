// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ActionFunctionArgs } from 'react-router';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

// Keep the real `parseFormData` (the action validates FormData through it);
// only stub the network call. `importOriginal` is SSR-safe here — the package's
// entry has no browser-only side effects.
vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { AddSkillTagDocument, RemoveSkillTagDocument, RenameSkillTagDocument } =
  await import('~/__generated__/graphql');
const { runVocabularyAction } = await import('../vocabulary');

const mockExecuteGraphqlWithAuth = vi.mocked(executeGraphqlWithAuth);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const actionArgs = (formData: FormData): ActionFunctionArgs => {
  const request = new Request('http://localhost/skills/vocabulary', {
    body: formData,
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/skills/vocabulary',
    request,
    url: new URL(request.url),
  };
};

describe('routing/skills/actions/vocabulary runVocabularyAction', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('addTag forwards the tag to AddSkillTag', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({}),
    );

    const formData = new FormData();
    formData.set('intent', 'addTag');
    formData.set('tag', 'pr-review');

    const result = await runVocabularyAction(actionArgs(formData));

    expect(result).toEqual({ intent: 'addTag', ok: true });
    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.any(Request),
      AddSkillTagDocument,
      { input: { tag: 'pr-review' } },
    );
  });

  test('addTag rejects an empty tag without calling the API', async () => {
    const formData = new FormData();
    formData.set('intent', 'addTag');
    formData.set('tag', '');

    const result = await runVocabularyAction(actionArgs(formData));

    expect(result).toEqual({ error: 'Tag is required.', intent: 'addTag' });
    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
  });

  test('renameTag forwards from/to to RenameSkillTag', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({}),
    );

    const formData = new FormData();
    formData.set('intent', 'renameTag');
    formData.set('from', 'old-name');
    formData.set('to', 'new-name');

    const result = await runVocabularyAction(actionArgs(formData));

    expect(result).toEqual({ intent: 'renameTag', ok: true });
    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.any(Request),
      RenameSkillTagDocument,
      { input: { from: 'old-name', to: 'new-name' } },
    );
  });

  test('renameTag requires both current and new tag', async () => {
    const formData = new FormData();
    formData.set('intent', 'renameTag');
    formData.set('from', 'old-name');
    formData.set('to', '');

    const result = await runVocabularyAction(actionArgs(formData));

    expect(result).toEqual({
      error: 'Both the current and new tag are required.',
      intent: 'renameTag',
    });
    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
  });

  test('removeTag forwards the tag to RemoveSkillTag', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphqlWithAuth>>>({}),
    );

    const formData = new FormData();
    formData.set('intent', 'removeTag');
    formData.set('tag', 'pr-review');

    const result = await runVocabularyAction(actionArgs(formData));

    expect(result).toEqual({ intent: 'removeTag', ok: true });
    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.any(Request),
      RemoveSkillTagDocument,
      { input: { tag: 'pr-review' } },
    );
  });

  test('surfaces the server error message as { error }', async () => {
    mockExecuteGraphqlWithAuth.mockRejectedValue(
      new Error('Unknown tags not in your vocabulary: foobar.'),
    );

    const formData = new FormData();
    formData.set('intent', 'addTag');
    formData.set('tag', 'pr-review');

    const result = await runVocabularyAction(actionArgs(formData));

    expect(result).toEqual({
      error: 'Unknown tags not in your vocabulary: foobar.',
      intent: 'addTag',
    });
  });

  test('returns an unknown-intent error for unrecognized intents', async () => {
    const formData = new FormData();
    formData.set('intent', 'bogus');

    const result = await runVocabularyAction(actionArgs(formData));

    expect(result).toEqual({
      error: 'Unknown intent "bogus".',
      intent: 'bogus',
    });
    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
  });
});
