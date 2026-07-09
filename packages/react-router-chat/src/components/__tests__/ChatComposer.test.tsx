import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ChatComposer } from '../ChatComposer';
import type { ChatComposerProps } from '../ChatComposer';

function assertTextArea(
  element: HTMLElement,
): asserts element is HTMLTextAreaElement {
  if (!(element instanceof HTMLTextAreaElement)) {
    throw new Error('Expected an HTMLTextAreaElement');
  }
}

describe('ChatComposer Component', () => {
  let component: RenderResult | undefined;
  let props: ChatComposerProps;
  let onSubmit: ReturnType<typeof vi.fn<(message: string) => void>>;

  const renderComposer = (p: ChatComposerProps): RenderResult => {
    const Comp = () => <ChatComposer {...p} />;
    const RoutesStub = createRoutesStub([{ Component: Comp, path: '/' }]);
    return render(<RoutesStub />);
  };

  const mountComposer = (
    overrides: Partial<ChatComposerProps> = {},
  ): RenderResult => {
    component?.unmount();
    component = renderComposer({ ...props, ...overrides });
    return component;
  };

  beforeEach(() => {
    onSubmit = vi.fn();
    props = { onSubmit };
  });

  afterEach(() => {
    component?.unmount();
    component = undefined;
  });

  test('should render message input and send button', () => {
    mountComposer();
    expect(component!.getByTestId('ChatComposer')).toBeInTheDocument();
    expect(component!.getByLabelText('Message')).toBeInTheDocument();
    expect(component!.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  describe('when user submits via button', () => {
    test('should call onSubmit with trimmed message and clear input', async () => {
      const user = userEvent.setup();
      mountComposer();
      const input = component!.getByLabelText('Message');
      await user.type(input, '  Hello world  ');
      await user.click(component!.getByRole('button', { name: 'Send' }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith('Hello world');
      expect(input).toHaveValue('');
    });
  });

  describe('when user presses Enter without Shift', () => {
    test('should submit the message', async () => {
      const user = userEvent.setup();
      mountComposer();
      const input = component!.getByLabelText('Message');
      await user.type(input, 'Quick reply');
      await user.keyboard('{Enter}');
      expect(onSubmit).toHaveBeenCalledWith('Quick reply');
    });
  });

  describe('when user presses Shift+Enter', () => {
    test('should not submit the message', async () => {
      const user = userEvent.setup();
      mountComposer();
      const input = component!.getByLabelText('Message');
      await user.type(input, 'Line one');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('when disabled is true', () => {
    test('should not call onSubmit', async () => {
      const user = userEvent.setup();
      mountComposer({ disabled: true });
      const input = component!.getByLabelText('Message');
      await user.type(input, 'Blocked');
      await user.click(component!.getByRole('button', { name: 'Send' }));
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('when message is only whitespace', () => {
    test('should not call onSubmit', async () => {
      const user = userEvent.setup();
      mountComposer();
      await user.type(component!.getByLabelText('Message'), '   ');
      await user.click(component!.getByRole('button', { name: 'Send' }));
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('when a toolbar is provided', () => {
    test('renders the toolbar node alongside the Send button', () => {
      mountComposer({
        toolbar: <div data-testid="composer-toolbar-slot" />,
      });
      expect(
        component!.getByTestId('composer-toolbar-slot'),
      ).toBeInTheDocument();
      expect(
        component!.getByRole('button', { name: 'Send' }),
      ).toBeInTheDocument();
    });
  });

  describe('when isStreaming is true', () => {
    test('shows Stop in place of Send and calls onStop', async () => {
      const onStop = vi.fn();
      const user = userEvent.setup();
      mountComposer({ isStreaming: true, onStop });

      expect(
        component!.queryByRole('button', { name: 'Send' }),
      ).not.toBeInTheDocument();
      const stop = component!.getByRole('button', { name: 'Stop' });
      expect(stop).toHaveAttribute('type', 'button');

      await user.click(stop);
      expect(onStop).toHaveBeenCalledTimes(1);
    });

    test('does not submit on Enter while streaming', async () => {
      const user = userEvent.setup();
      mountComposer({ isStreaming: true, onStop: vi.fn() });
      await user.type(component!.getByLabelText('Message'), 'mid-stream');
      await user.keyboard('{Enter}');
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
  describe('controlled draft + readOnly (voice input)', () => {
    test('renders the controlled draft and reports edits via onDraftChange', async () => {
      const onDraftChange = vi.fn();
      const user = userEvent.setup();
      mountComposer({ draft: 'frozen prefix', onDraftChange });

      const textarea = component!.getByLabelText('Message');
      assertTextArea(textarea);
      expect(textarea.value).toBe('frozen prefix');

      await user.type(textarea, '!');
      expect(onDraftChange).toHaveBeenCalledWith('frozen prefix!');
    });

    test('clears via onDraftChange after a controlled submit', async () => {
      const onDraftChange = vi.fn();
      const user = userEvent.setup();
      mountComposer({ draft: 'say hello', onDraftChange });

      await user.click(component!.getByRole('button', { name: 'Send' }));

      expect(onSubmit).toHaveBeenCalledWith('say hello');
      expect(onDraftChange).toHaveBeenLastCalledWith('');
    });

    test('readOnly freezes the textarea and blocks Enter-submit', async () => {
      const user = userEvent.setup();
      mountComposer({
        draft: 'listening…',
        onDraftChange: vi.fn(),
        readOnly: true,
      });

      const textarea = component!.getByLabelText('Message');
      assertTextArea(textarea);
      expect(textarea).toHaveAttribute('readonly');

      textarea.focus();
      await user.keyboard('{Enter}');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    test('exposes the textarea through textAreaRef', () => {
      const ref = React.createRef<HTMLTextAreaElement>();
      mountComposer({ textAreaRef: ref });

      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });
  });
});
