import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { EditorNewFileForm } from '../EditorNewFileForm';
import type { EditorNewFileFormProps } from '../EditorNewFileForm';

interface FetcherData {
  readonly filename?: string;
  readonly message: string;
  readonly success: boolean;
}

interface SubmitOptions {
  readonly action: string;
  readonly method: string;
}

let fetcherData: FetcherData | undefined;
let fetcherState: 'idle' | 'loading' | 'submitting' = 'idle';
const mockSubmit =
  vi.fn<(formData: FormData, options: SubmitOptions) => void>();

vi.mock('react-router', () => ({
  useFetcher: () => ({
    data: fetcherData,
    state: fetcherState,
    submit: mockSubmit,
  }),
}));

const renderForm = (
  props: Partial<EditorNewFileFormProps> = {},
): { component: RenderResult; user: ReturnType<typeof userEvent.setup> } => {
  const defaultProps: EditorNewFileFormProps = {
    isVisible: true,
    onCancel: vi.fn(),
    onSuccess: vi.fn(),
  };

  const component = render(<EditorNewFileForm {...defaultProps} {...props} />);

  return { component, user: userEvent.setup() };
};

const getFilenameInput = (component: RenderResult): HTMLInputElement => {
  const element = component.getByLabelText(/filename/i);

  if (!(element instanceof HTMLInputElement)) {
    throw new Error('expected the filename field to be an <input>');
  }

  return element;
};

const getCreateButton = (component: RenderResult): HTMLButtonElement => {
  const element = component.getByRole('button', {
    name: /^(Create|Creating\.\.\.)$/,
  });

  if (!(element instanceof HTMLButtonElement)) {
    throw new Error('expected the Create control to be a <button>');
  }

  return element;
};

describe('EditorNewFileForm Component', () => {
  beforeEach(() => {
    fetcherData = undefined;
    fetcherState = 'idle';
    mockSubmit.mockReset();
  });

  test('renders nothing when not visible', () => {
    const { component } = renderForm({ isVisible: false });

    expect(component.queryByTestId('EditorNewFileForm')).toBeNull();
  });

  test('renders the filename input and type select when visible', () => {
    const { component } = renderForm();

    expect(component.getByTestId('EditorNewFileForm')).not.toBeNull();
    expect(getFilenameInput(component)).not.toBeNull();
    expect(getCreateButton(component).textContent).toBe('Create');
  });

  test('disables Create until a valid filename is entered', async () => {
    const { component, user } = renderForm();

    expect(getCreateButton(component).disabled).toBe(true);

    await user.type(getFilenameInput(component), 'my-prompt.md');

    expect(getCreateButton(component).disabled).toBe(false);
  });

  test('shows a validation error and skips submit for an invalid filename on Enter', async () => {
    const { component, user } = renderForm();

    await user.type(getFilenameInput(component), 'Bad Name.md{Enter}');

    expect(
      component.getByText(/must be in kebab-case|PascalCase/i),
    ).not.toBeNull();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  test('submits the trimmed filename and default prompt type', async () => {
    const { component, user } = renderForm();

    await user.type(getFilenameInput(component), 'my-prompt.md');
    await user.click(getCreateButton(component));

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const [formData, options] = mockSubmit.mock.calls[0] ?? [];
    if (!formData || !options) {
      throw new Error('expected submit to have been called with arguments');
    }
    expect(formData.get('_action')).toBe('createFile');
    expect(formData.get('filename')).toBe('my-prompt.md');
    expect(formData.get('promptType')).toBe('prompts');
    expect(options).toEqual({ action: '/prompts', method: 'POST' });
  });

  test('honors a custom basePath as the submit action', async () => {
    const { component, user } = renderForm({ basePath: '/docs' });

    await user.type(getFilenameInput(component), 'my-prompt.md');
    await user.click(getCreateButton(component));

    const [, options] = mockSubmit.mock.calls[0] ?? [];
    if (!options) {
      throw new Error('expected submit to have been called with arguments');
    }
    expect(options.action).toBe('/docs');
  });

  test('shows the submitting state and disables the Create button', () => {
    fetcherState = 'submitting';
    const { component } = renderForm();

    const button = getCreateButton(component);
    expect(button.textContent).toBe('Creating...');
    expect(button.disabled).toBe(true);
  });

  test('cancels via Escape and clears the filename', async () => {
    const onCancel = vi.fn();
    const { component, user } = renderForm({ onCancel });

    await user.type(getFilenameInput(component), 'my-prompt.md');
    await user.type(getFilenameInput(component), '{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(getFilenameInput(component).value).toBe('');
  });

  test('cancels via the Cancel button', async () => {
    const onCancel = vi.fn();
    const { component, user } = renderForm({ onCancel });

    await user.click(component.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('calls onSuccess and resets the field when the fetcher reports success', () => {
    const onSuccess = vi.fn();
    const { component } = renderForm({ onSuccess });

    fetcherData = {
      filename: 'created.md',
      message: 'Created',
      success: true,
    };
    component.rerender(
      <EditorNewFileForm
        isVisible={true}
        onCancel={vi.fn()}
        onSuccess={onSuccess}
      />,
    );

    expect(onSuccess).toHaveBeenCalledWith('created.md');
  });

  test('shows the fetcher error message on failure', () => {
    const { component } = renderForm();

    fetcherData = { message: 'File already exists', success: false };
    component.rerender(
      <EditorNewFileForm
        isVisible={true}
        onCancel={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(component.getByText('File already exists')).not.toBeNull();
  });
});
