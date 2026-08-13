import * as React from 'react';
import { act, render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PROMPTS_DEFAULT_CONTENT } from '~/routing/prompts/config';
import {
  usePromptCreateForm,
  type UsePromptCreateFormResult,
} from '../usePromptCreateForm';

function renderPromptCreateForm(): {
  readonly value: { current: UsePromptCreateFormResult | null };
} {
  const value: { current: UsePromptCreateFormResult | null } = {
    current: null,
  };

  function HookProbe(): null {
    value.current = usePromptCreateForm();
    return null;
  }

  const Stub = createRoutesStub([
    {
      Component: HookProbe,
      action: () => ({ ok: true }),
      path: '/',
    },
  ]);

  render(<Stub initialEntries={['/']} />);
  return { value };
}

describe('usePromptCreateForm', () => {
  test('starts with default content and disabled submit', () => {
    const { value } = renderPromptCreateForm();

    expect(value.current?.content).toBe(PROMPTS_DEFAULT_CONTENT);
    expect(value.current?.title).toBe('');
    expect(value.current?.promptType).toBe('prompts');
    expect(value.current?.canSubmit).toBe(false);
    expect(value.current?.isSubmitting).toBe(false);
  });

  test('canSubmit becomes true once title and content are non-blank', () => {
    const { value } = renderPromptCreateForm();

    act(() => {
      value.current?.setTitle('  ');
    });
    expect(value.current?.canSubmit).toBe(false);

    act(() => {
      value.current?.setTitle('My Prompt');
    });
    expect(value.current?.canSubmit).toBe(true);
  });

  test('handleEditorChange updates content, treating undefined as empty', () => {
    const { value } = renderPromptCreateForm();

    act(() => {
      value.current?.handleEditorChange('new body');
    });
    expect(value.current?.content).toBe('new body');

    act(() => {
      value.current?.handleEditorChange(undefined);
    });
    expect(value.current?.content).toBe('');
  });

  test('setters update description, filePath, labels, and promptType', () => {
    const { value } = renderPromptCreateForm();

    act(() => {
      value.current?.setDescription('desc');
      value.current?.setFilePath('path/to/file');
      value.current?.setLabels('a,b');
      value.current?.setPromptType('skills');
    });

    expect(value.current?.description).toBe('desc');
    expect(value.current?.filePath).toBe('path/to/file');
    expect(value.current?.labels).toBe('a,b');
    expect(value.current?.promptType).toBe('skills');
  });

  test('handleSubmit is a no-op while canSubmit is false', () => {
    const { value } = renderPromptCreateForm();

    act(() => {
      value.current?.handleSubmit();
    });

    expect(value.current?.isSubmitting).toBe(false);
  });

  test('handleSubmit submits when title and content are present', async () => {
    const { value } = renderPromptCreateForm();

    act(() => {
      value.current?.setTitle('My Prompt');
    });

    await act(async () => {
      value.current?.handleSubmit();
    });

    expect(value.current?.title).toBe('My Prompt');
  });
});
