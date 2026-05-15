import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ChatDialog } from '../ChatDialog';
import type { ChatDialogProps } from '../ChatDialog';
import type { ChatMessage } from '../../types';

describe('ChatDialog Component', () => {
  let component: RenderResult | undefined;
  let props: ChatDialogProps;
  let onSendMessage: ReturnType<typeof vi.fn<(message: string) => void>>;

  const messages: readonly ChatMessage[] = [
    { body: 'Existing', id: 'm1', role: 'assistant' },
  ];

  const renderDialog = (p: ChatDialogProps): RenderResult => {
    const Comp = () => <ChatDialog {...p} />;
    const RoutesStub = createRoutesStub([{ Component: Comp, path: '/' }]);
    return render(<RoutesStub />);
  };

  const mountDialog = (
    overrides: Partial<ChatDialogProps> = {},
  ): RenderResult => {
    component?.unmount();
    component = renderDialog({ ...props, ...overrides });
    return component;
  };

  beforeEach(() => {
    onSendMessage = vi.fn();
    props = {
      messages,
      onSendMessage,
      triggerLabel: 'Open assistant',
    };
  });

  afterEach(() => {
    component?.unmount();
    component = undefined;
  });

  test('should render trigger button', () => {
    mountDialog();
    expect(
      component!.getByRole('button', { name: 'Open assistant' }),
    ).toBeInTheDocument();
  });

  describe('when trigger is clicked', () => {
    test('should open dialog and show thread messages', async () => {
      const user = userEvent.setup();
      mountDialog();
      await user.click(
        component!.getByRole('button', { name: 'Open assistant' }),
      );
      expect(component!.getByRole('dialog')).toBeInTheDocument();
      expect(component!.getByText('Existing')).toBeInTheDocument();
      expect(component!.getByText('Chat')).toBeInTheDocument();
    });

    test('should call onSendMessage when a message is sent', async () => {
      const user = userEvent.setup();
      mountDialog();
      await user.click(
        component!.getByRole('button', { name: 'Open assistant' }),
      );
      const input = component!.getByLabelText('Message');
      await user.type(input, 'New question');
      await user.click(component!.getByRole('button', { name: 'Send' }));
      expect(onSendMessage).toHaveBeenCalledWith('New question');
    });
  });

  describe('when title is provided', () => {
    test('should show custom title in dialog', async () => {
      const user = userEvent.setup();
      mountDialog({ title: 'Agent chat' });
      await user.click(
        component!.getByRole('button', { name: 'Open assistant' }),
      );
      expect(component!.getByText('Agent chat')).toBeInTheDocument();
    });
  });

  describe('when variant is sheet', () => {
    test('should open sheet panel with chat content', async () => {
      const user = userEvent.setup();
      mountDialog({ variant: 'sheet' });
      await user.click(
        component!.getByRole('button', { name: 'Open assistant' }),
      );
      expect(component!.getByTestId('ChatDialog')).toBeInTheDocument();
      expect(component!.getByText('Existing')).toBeInTheDocument();
    });
  });

  describe('when composerDisabled is true', () => {
    test('should disable composer inside open dialog', async () => {
      const user = userEvent.setup();
      mountDialog({ composerDisabled: true });
      await user.click(
        component!.getByRole('button', { name: 'Open assistant' }),
      );
      expect(component!.getByLabelText('Message')).toBeDisabled();
    });
  });

  describe('when open is controlled', () => {
    test('should show dialog when open is true without clicking trigger', () => {
      const Controlled = (): React.ReactElement => {
        const [open, setOpen] = React.useState(true);
        return (
          <ChatDialog
            messages={messages}
            onOpenChange={setOpen}
            onSendMessage={onSendMessage}
            open={open}
            triggerLabel="Controlled"
          />
        );
      };
      const RoutesStub = createRoutesStub([
        { Component: Controlled, path: '/' },
      ]);
      component = render(<RoutesStub />);
      expect(component.getByRole('dialog')).toBeInTheDocument();
      expect(component.getByText('Existing')).toBeInTheDocument();
    });
  });

  describe('when messages and onSendMessage are missing', () => {
    test('should surface error without ChatProvider', () => {
      const Broken = (): React.ReactElement => (
        <ChatDialog triggerLabel="Broken" />
      );
      const RoutesStub = createRoutesStub([{ Component: Broken, path: '/' }]);
      component = render(<RoutesStub />);
      expect(
        component.getByRole('heading', {
          level: 3,
          name: /ChatDialog requires messages and onSendMessage props, or a ChatProvider ancestor/,
        }),
      ).toBeInTheDocument();
    });
  });
});
