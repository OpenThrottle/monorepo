import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PromptCreateForm } from './PromptCreateForm';
import type { PromptCreateFormProps } from './PromptCreateForm';

// Monaco cannot boot under jsdom; stand in a textarea with the same
// controlled value/onChange contract so the editor is exercisable.
vi.mock('@openthrottle/react-router-editor', () => ({
  EditorWindow: (props: {
    onChange?: (value: string | undefined) => void;
    value?: string;
  }) => (
    <textarea
      data-testid="mock-editor-window"
      onChange={(event) => props.onChange?.(event.target.value)}
      value={props.value}
    />
  ),
  PROMPT_TYPE_OPTIONS: [
    { name: 'Agents', value: 'agents' },
    { name: 'Commands', value: 'commands' },
    { name: 'Prompts', value: 'prompts' },
    { name: 'Skills', value: 'skills' },
  ],
}));

const buildForm = (
  overrides: Partial<PromptCreateFormProps['form']> = {},
): PromptCreateFormProps['form'] => ({
  canSubmit: true,
  content: '# Hello',
  description: '',
  filePath: '',
  handleEditorChange: vi.fn(),
  handleSubmit: vi.fn(),
  isSubmitting: false,
  labels: '',
  promptType: 'prompts',
  setDescription: vi.fn(),
  setFilePath: vi.fn(),
  setLabels: vi.fn(),
  setPromptType: vi.fn(),
  setTitle: vi.fn(),
  title: 'My Prompt',
  ...overrides,
});

describe('PromptCreateForm Component', () => {
  let component: RenderResult;
  let props: PromptCreateFormProps;

  beforeEach(() => {
    props = { error: undefined, form: buildForm() };
    component = render(<PromptCreateForm {...props} />);
  });

  test('renders the page heading and back link', () => {
    expect(
      component.getByRole('heading', { name: 'Create New Prompt' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /back to prompts/i }),
    ).toBeInTheDocument();
  });

  test('renders the title input seeded from form state', () => {
    expect(component.getByLabelText('Title *')).toHaveValue('My Prompt');
  });

  test('shows an error message when present', () => {
    component = render(
      <PromptCreateForm error="Title is required." form={buildForm()} />,
    );

    expect(component.getByText('Title is required.')).toBeInTheDocument();
  });

  test('disables the create button while submitting', () => {
    component = render(
      <PromptCreateForm
        error={undefined}
        form={buildForm({ isSubmitting: true })}
      />,
    );

    expect(
      component.getByRole('button', { name: 'Creating...' }),
    ).toBeDisabled();
  });

  test('calls setTitle when the title input changes', async () => {
    const setTitle = vi.fn();
    const user = userEvent.setup();
    component.unmount();
    component = render(
      <PromptCreateForm error={undefined} form={buildForm({ setTitle })} />,
    );

    await user.type(component.getByLabelText('Title *'), 'x');

    expect(setTitle).toHaveBeenCalled();
  });

  test('calls handleSubmit when the Create Prompt button is clicked', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();
    component.unmount();
    component = render(
      <PromptCreateForm error={undefined} form={buildForm({ handleSubmit })} />,
    );

    await user.click(component.getByRole('button', { name: 'Create Prompt' }));

    expect(handleSubmit).toHaveBeenCalled();
  });
});
