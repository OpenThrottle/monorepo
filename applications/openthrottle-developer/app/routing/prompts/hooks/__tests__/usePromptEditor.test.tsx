import * as React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { CustomPromptType } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/prompts.$promptId';
import { usePromptEditor } from '../usePromptEditor';
import type { UsePromptEditorResult } from '../usePromptEditor';

type PromptDetail = Route.ComponentProps['loaderData']['prompt'];
type PromptEditorActionData = Route.ComponentProps['actionData'];

const mockPrompt: PromptDetail = {
  content: '# Test Prompt',
  createdAt: '2024-01-01T00:00:00Z',
  description: 'A test prompt',
  filePath: 'test.md',
  id: 'test-id',
  labels: ['test'],
  projectId: null,
  promptType: CustomPromptType.Prompts,
  title: 'Test Prompt',
  updatedAt: '2024-01-01T00:00:00Z',
  userId: 'user-id',
};

interface SubmittedForm {
  content: FormDataEntryValue | null;
  intent: FormDataEntryValue | null;
}

function renderPromptEditor(
  prompt: PromptDetail,
  actionData: PromptEditorActionData,
  submitted: SubmittedForm[],
): { component: RenderResult; result: () => UsePromptEditorResult } {
  const state: { current: UsePromptEditorResult | null } = { current: null };

  function HookProbe(): null {
    state.current = usePromptEditor(prompt, actionData);
    return null;
  }

  const Stub = createRoutesStub([
    {
      Component: HookProbe,
      action: async ({ request }: { request: Request }) => {
        const formData = await request.formData();
        submitted.push({
          content: formData.get('content'),
          intent: formData.get('intent'),
        });
        return actionData ?? { success: true };
      },
      path: '/',
    },
  ]);

  const component = render(<Stub />);

  return {
    component,
    result: () => {
      if (state.current === null) {
        throw new Error('hook has not rendered yet');
      }
      return state.current;
    },
  };
}

describe('usePromptEditor', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  test('seeds content from the prompt and starts clean', () => {
    const submitted: SubmittedForm[] = [];
    const { result } = renderPromptEditor(mockPrompt, undefined, submitted);

    expect(result().content).toBe(mockPrompt.content);
    expect(result().isDirty).toBe(false);
    expect(result().statusText).toBe('');
  });

  test('derives the editor language from the file extension', () => {
    const submitted: SubmittedForm[] = [];
    const { result } = renderPromptEditor(
      { ...mockPrompt, filePath: 'notes.mdc' },
      undefined,
      submitted,
    );

    expect(result().language).toBeTruthy();
  });

  test('handleEditorChange marks the editor dirty and updates statusText', () => {
    const submitted: SubmittedForm[] = [];
    const { result } = renderPromptEditor(mockPrompt, undefined, submitted);

    act(() => result().handleEditorChange('# Changed content'));

    expect(result().content).toBe('# Changed content');
    expect(result().isDirty).toBe(true);
    expect(result().statusText).toBe('Unsaved changes');
  });

  test('handleEditorChange back to the original content clears dirty', () => {
    const submitted: SubmittedForm[] = [];
    const { result } = renderPromptEditor(mockPrompt, undefined, submitted);

    act(() => result().handleEditorChange('# Changed content'));
    expect(result().isDirty).toBe(true);

    act(() => result().handleEditorChange(mockPrompt.content));
    expect(result().isDirty).toBe(false);
  });

  test('handleSave submits an update intent with the current content when dirty', async () => {
    const submitted: SubmittedForm[] = [];
    const { result } = renderPromptEditor(mockPrompt, undefined, submitted);

    act(() => result().handleEditorChange('# Changed content'));
    act(() => result().handleSave());

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]).toEqual({
      content: '# Changed content',
      intent: 'update',
    });
  });

  test('handleSave is a no-op when the editor is not dirty', () => {
    const submitted: SubmittedForm[] = [];
    const { result } = renderPromptEditor(mockPrompt, undefined, submitted);

    act(() => result().handleSave());

    expect(submitted).toHaveLength(0);
  });

  test('handleWriteToFileSystem submits a writeToFileSystem intent', async () => {
    const submitted: SubmittedForm[] = [];
    const { result } = renderPromptEditor(mockPrompt, undefined, submitted);

    act(() => result().handleWriteToFileSystem());

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].intent).toBe('writeToFileSystem');
  });

  test('handleDelete asks for confirmation before submitting a delete intent', async () => {
    const submitted: SubmittedForm[] = [];
    const { result } = renderPromptEditor(mockPrompt, undefined, submitted);

    act(() => result().handleDelete());

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].intent).toBe('delete');
  });

  test('handleDelete does not submit when confirmation is declined', () => {
    confirmSpy.mockReturnValue(false);
    const submitted: SubmittedForm[] = [];
    const { result } = renderPromptEditor(mockPrompt, undefined, submitted);

    act(() => result().handleDelete());

    expect(submitted).toHaveLength(0);
  });

  test('reports the action error in statusText', () => {
    const submitted: SubmittedForm[] = [];
    const { result } = renderPromptEditor(
      mockPrompt,
      { error: 'Failed to update prompt.' },
      submitted,
    );

    expect(result().statusText).toBe('Failed to update prompt.');
  });

  test('reports Saved in statusText on a successful action', () => {
    const submitted: SubmittedForm[] = [];
    const { result } = renderPromptEditor(
      mockPrompt,
      { success: true },
      submitted,
    );

    expect(result().statusText).toBe('Saved');
  });
});
