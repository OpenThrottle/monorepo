import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { ChatComposerInput } from '../ChatComposerInput';
import type { ChatComposerInputProps } from '../ChatComposerInput';
import type { UseChatComposerMentionsResult } from '../../hooks/use-chat-composer-mentions';
import type { UseChatComposerSlashCommandsResult } from '../../hooks/use-chat-composer-slash-commands';

const buildMentions = (
  overrides: Partial<UseChatComposerMentionsResult> = {},
): UseChatComposerMentionsResult => ({
  activeIndex: 0,
  handleKeyDown: vi.fn(() => false),
  listboxId: 'mentions-listbox',
  loading: false,
  mentionEnabled: false,
  onChange: vi.fn(),
  onClick: vi.fn(),
  onKeyUp: vi.fn(),
  optionId: (index: number) => `mentions-listbox-opt-${index}`,
  popoverOpen: false,
  reset: vi.fn(),
  results: [],
  selectOption: vi.fn(),
  setActiveIndex: vi.fn(),
  setRefs: vi.fn(),
  ...overrides,
});

const buildSlash = (
  overrides: Partial<UseChatComposerSlashCommandsResult> = {},
): UseChatComposerSlashCommandsResult => ({
  activeIndex: 0,
  handleKeyDown: vi.fn(() => false),
  listboxId: 'slash-listbox',
  loading: false,
  onChange: vi.fn(),
  onClick: vi.fn(),
  onKeyUp: vi.fn(),
  optionId: (index: number) => `slash-listbox-opt-${index}`,
  popoverOpen: false,
  reset: vi.fn(),
  results: [],
  selectOption: vi.fn(),
  setActiveIndex: vi.fn(),
  setRefs: vi.fn(),
  slashEnabled: false,
  ...overrides,
});

const renderInput = (
  overrides: Partial<ChatComposerInputProps> = {},
): RenderResult =>
  render(
    <ChatComposerInput
      disabled={false}
      draft=""
      mentions={buildMentions()}
      onKeyDown={vi.fn()}
      placeholder="Message"
      readOnly={false}
      slash={buildSlash()}
      {...overrides}
    />,
  );

describe('ChatComposerInput Component', () => {
  test('renders the textarea with the given draft and placeholder', () => {
    const component = renderInput({ draft: 'hello world' });

    const textarea = component.getByLabelText('Message');
    expect(textarea).toHaveValue('hello world');
    expect(textarea).toHaveAttribute('placeholder', 'Message');
  });

  test('renders as disabled and read-only', () => {
    const component = renderInput({ disabled: true, readOnly: true });

    const textarea = component.getByLabelText('Message');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveAttribute('readonly');
  });

  test('fans onChange out to both the mentions and slash state machines', async () => {
    const mentions = buildMentions();
    const slash = buildSlash();
    const component = renderInput({ mentions, slash });

    const user = userEvent.setup();
    await user.type(component.getByLabelText('Message'), 'a');

    expect(mentions.onChange).toHaveBeenCalled();
    expect(slash.onChange).toHaveBeenCalled();
  });

  test('fires the composed onKeyDown handler', async () => {
    const onKeyDown = vi.fn();
    const component = renderInput({ onKeyDown });

    const user = userEvent.setup();
    await user.type(component.getByLabelText('Message'), '{Enter}');

    expect(onKeyDown).toHaveBeenCalled();
  });

  test('renders the mention popover when mentions.popoverOpen is true', () => {
    const mentions = buildMentions({
      popoverOpen: true,
      results: ['src/app/root.tsx'],
    });
    const component = renderInput({ mentions });

    expect(component.getByText('src/app/root.tsx')).toBeInTheDocument();
  });

  test('renders the slash-command popover when slash.popoverOpen is true', () => {
    const slash = buildSlash({
      popoverOpen: true,
      results: [{ description: 'Run tests', slug: 'test' }],
    });
    const component = renderInput({ slash });

    expect(component.getByText('/test')).toBeInTheDocument();
  });

  test('does not render either popover when both are closed', () => {
    const component = renderInput();

    expect(component.queryByRole('listbox')).not.toBeInTheDocument();
  });

  test('applies the read-only muted style to the textarea', () => {
    const component = renderInput({ readOnly: true });

    expect(component.getByLabelText('Message')).toHaveClass(
      'text-muted-foreground',
    );
  });
});
