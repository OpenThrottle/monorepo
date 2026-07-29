import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { ChatProvider } from '../../context/chat-context';
import type { ChatComposerControls } from '../../context/chat-context';
import { ChatDialog } from '../ChatDialog';
import type { ChatDialogProps } from '../ChatDialog';
import { ChatComposerMode } from '../../types';
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
      // eslint-disable-next-line react/no-multi-comp -- test-local harness component
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

  describe('when ChatProvider supplies onStartNewChat', () => {
    test('should show New chat control in dialog header', async () => {
      const user = userEvent.setup();
      const onStartNewChat = vi.fn();
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Comp = () => (
        <TooltipProvider>
          <ChatProvider
            messages={messages}
            onSendMessage={onSendMessage}
            onStartNewChat={onStartNewChat}
          >
            <ChatDialog triggerLabel="Open assistant" />
          </ChatProvider>
        </TooltipProvider>
      );
      const RoutesStub = createRoutesStub([{ Component: Comp, path: '/' }]);
      component = render(<RoutesStub />);

      await user.click(
        component.getByRole('button', { name: 'Open assistant' }),
      );

      expect(
        component.getByRole('button', { name: 'New chat' }),
      ).toBeInTheDocument();
    });
  });

  describe('when onStartNewChat is not provided', () => {
    test('should not show New chat control', async () => {
      const user = userEvent.setup();
      mountDialog();
      await user.click(
        component!.getByRole('button', { name: 'Open assistant' }),
      );

      expect(
        component!.queryByRole('button', { name: 'New chat' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when a composer selection surface is provided', () => {
    const buildComposer = (
      overrides: Partial<ChatComposerControls> = {},
    ): ChatComposerControls => ({
      mode: ChatComposerMode.plan,
      modelId: 'm1',
      models: [{ id: 'm1', label: 'Model One' }],
      ...overrides,
    });

    const mountWithComposer = (
      composer: ChatComposerControls,
    ): RenderResult => {
      component?.unmount();
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Comp = () => (
        <TooltipProvider>
          <ChatDialog
            composer={composer}
            messages={messages}
            onSendMessage={onSendMessage}
            triggerLabel="Open assistant"
          />
        </TooltipProvider>
      );
      const RoutesStub = createRoutesStub([{ Component: Comp, path: '/' }]);
      component = render(<RoutesStub />);
      return component;
    };

    test('should render the toolbar inside the open dialog', async () => {
      const user = userEvent.setup();
      mountWithComposer(buildComposer());
      await user.click(
        component!.getByRole('button', { name: 'Open assistant' }),
      );
      expect(component!.getByTestId('ChatComposerToolbar')).toBeInTheDocument();
      expect(
        component!.getByTestId('ChatComposerToolbar-model-select'),
      ).toBeInTheDocument();
    });

    test('should invoke the injected setter when a control changes', async () => {
      const user = userEvent.setup();
      const onModelChange = vi.fn();
      mountWithComposer(
        buildComposer({
          models: [
            { id: 'm1', label: 'Model One' },
            { id: 'm2', label: 'Model Two' },
          ],
          onModelChange,
        }),
      );
      await user.click(
        component!.getByRole('button', { name: 'Open assistant' }),
      );
      await user.click(
        component!.getByTestId('ChatComposerToolbar-model-select'),
      );
      await user.click(component!.getByRole('option', { name: 'Model Two' }));
      expect(onModelChange).toHaveBeenCalledWith('m2');
    });

    test('should show the Stop control wired to onStop while streaming', async () => {
      const user = userEvent.setup();
      const onStop = vi.fn();
      mountWithComposer(buildComposer({ isStreaming: true, onStop }));
      await user.click(
        component!.getByRole('button', { name: 'Open assistant' }),
      );
      await user.click(component!.getByRole('button', { name: 'Stop' }));
      expect(onStop).toHaveBeenCalledTimes(1);
    });
  });

  describe('conversations switcher', () => {
    // The switcher trigger renders a Tooltip, so (like the New chat control)
    // it must mount under a TooltipProvider — mirror real usage (GlobalProviders).
    const renderWithSidebar = (
      conversationSidebar?: ChatDialogProps['conversationSidebar'],
    ): RenderResult => {
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Comp = (): React.ReactElement => (
        <TooltipProvider>
          <ChatDialog
            conversationSidebar={conversationSidebar}
            messages={messages}
            onSendMessage={onSendMessage}
            triggerLabel="Open assistant"
          />
        </TooltipProvider>
      );
      const RoutesStub = createRoutesStub([{ Component: Comp, path: '/' }]);
      component = render(<RoutesStub />);
      return component;
    };

    test('renders no switcher trigger without a conversationSidebar', async () => {
      const user = userEvent.setup();
      renderWithSidebar(undefined);
      await user.click(
        component!.getByRole('button', { name: 'Open assistant' }),
      );
      await component!.findByTestId('ChatDialog');
      expect(
        component!.queryByTestId('ChatDialog-conversations-trigger'),
      ).not.toBeInTheDocument();
    });

    test('opens a popover listing conversations and selects one', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      renderWithSidebar({
        conversations: [
          {
            id: 'c1',
            status: 'active',
            title: 'Prior thread',
            updatedAt: '2026-07-29T12:00:00.000Z',
          },
        ],
        onDelete: vi.fn(),
        onNewChat: vi.fn(),
        onRename: vi.fn(),
        onSelect,
        totalCount: 1,
      });
      await user.click(
        component!.getByRole('button', { name: 'Open assistant' }),
      );
      await user.click(
        await component!.findByTestId('ChatDialog-conversations-trigger'),
      );
      await user.click(
        await component!.findByTestId('ChatConversationSidebar-select-c1'),
      );

      expect(onSelect).toHaveBeenCalledWith('c1');
    });
  });

  describe('when no composer surface is provided', () => {
    test('should render the bare composer without a toolbar', async () => {
      const user = userEvent.setup();
      mountDialog();
      await user.click(
        component!.getByRole('button', { name: 'Open assistant' }),
      );
      expect(
        component!.queryByTestId('ChatComposerToolbar'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when messages and onSendMessage are missing', () => {
    test('should surface error without ChatProvider', () => {
      // eslint-disable-next-line react/no-multi-comp -- test-local mock component
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
