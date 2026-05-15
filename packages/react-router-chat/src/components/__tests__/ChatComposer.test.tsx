import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ChatComposer } from '../ChatComposer';
import type { ChatComposerProps } from '../ChatComposer';

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
      await user.click(component.getByRole('button', { name: 'Send' }));
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
});
