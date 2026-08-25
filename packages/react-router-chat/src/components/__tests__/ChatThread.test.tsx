import * as React from 'react';
import { act, render, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ChatThread } from '../ChatThread';
import type { ChatThreadProps } from '../ChatThread';
import type { ChatMessage } from '../../types';

describe('ChatThread Component', () => {
  let component: RenderResult;
  let props: ChatThreadProps;

  const renderThread = (p: ChatThreadProps): RenderResult => {
    const Comp = () => <ChatThread {...p} />;
    const RoutesStub = createRoutesStub([{ Component: Comp, path: '/' }]);
    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = { messages: [] };
    component = renderThread(props);
  });

  test('should render empty state', () => {
    expect(component.getByTestId('ChatThread')).toBeInTheDocument();
    expect(
      component.getByText('No messages yet. Send one to start.'),
    ).toBeInTheDocument();
  });

  describe('when messages are provided', () => {
    const messages: readonly ChatMessage[] = [
      { body: 'Hello', id: '1', role: 'user' },
      { body: 'Hi there', id: '2', role: 'assistant' },
    ];

    beforeEach(() => {
      component = renderThread({ ...props, messages });
    });

    test('should render each message body', () => {
      expect(component.getByText('Hello')).toBeInTheDocument();
      expect(component.getByText('Hi there')).toBeInTheDocument();
    });

    test('should render role labels', () => {
      expect(component.getByText('You')).toBeInTheDocument();
      expect(component.getByText('Clutch Assistant')).toBeInTheDocument();
    });

    test('should render assistant content in Markdown wrapper', async () => {
      // The markdown renderer is lazy; wait for it before asserting on its DOM.
      await component.findByTestId('MarkdownRenderer');

      expect(component.getByTestId('ChatThread-message-2')).toBeInTheDocument();
      expect(
        component
          .getByTestId('ChatThread-message-2')
          .querySelector('.markdown'),
      ).toBeInTheDocument();
    });
  });

  describe('when assistant message has markdown-like body', () => {
    test('should render assistant body via Markdown', async () => {
      const markdownMessages: readonly ChatMessage[] = [
        { body: '# Title', id: 'a1', role: 'assistant' },
      ];
      component = renderThread({ messages: markdownMessages });
      await component.findByTestId('MarkdownRenderer');

      // The renderer parses Markdown, so `# Title` becomes a heading element
      // with the text `Title` — not the literal `# Title` string.
      const heading = component.getByRole('heading', { name: 'Title' });
      expect(heading).toBeInTheDocument();
      expect(component.queryByText('# Title')).not.toBeInTheDocument();
    });
  });

  describe('when message has createdAt', () => {
    test('should render a time element', () => {
      component = renderThread({
        messages: [
          {
            body: 'Hi',
            createdAt: '2026-05-15T12:00:00.000Z',
            id: 't1',
            role: 'user',
          },
        ],
      });
      expect(component.getByRole('time')).toHaveAttribute(
        'datetime',
        '2026-05-15T12:00:00.000Z',
      );
    });
  });

  describe('when assistant message has a footer', () => {
    test('should render the footer line', () => {
      component = renderThread({
        messages: [
          {
            body: 'Hi',
            footer: 'Tool: health · confidence 0.95',
            id: 'f1',
            role: 'assistant',
          },
        ],
      });
      expect(
        component.getByText('Tool: health · confidence 0.95'),
      ).toBeInTheDocument();
    });
  });

  describe('when message body is empty', () => {
    test('should show empty content fallback', () => {
      component = renderThread({
        messages: [{ body: '  ', id: 'e1', role: 'assistant' }],
      });
      expect(component.getByText('(No content)')).toBeInTheDocument();
    });
  });

  describe('when emptyStateLabel is set', () => {
    test('should show custom empty label', () => {
      component = renderThread({
        ...props,
        emptyStateLabel: 'Start the conversation',
      });
      expect(component.getByText('Start the conversation')).toBeInTheDocument();
    });
  });

  describe('retry affordance', () => {
    const messages: readonly ChatMessage[] = [
      { body: 'Hello', id: '1', role: 'user' },
      { body: '', id: '2', role: 'assistant' },
    ];

    test('renders the Retry notice when canRetry and onRetry are set', () => {
      component = renderThread({ canRetry: true, messages, onRetry: vi.fn() });
      expect(
        within(component.container).getByTestId('ChatRetryNotice'),
      ).toBeInTheDocument();
    });

    test('does not render the Retry notice without canRetry', () => {
      component = renderThread({ messages, onRetry: vi.fn() });
      expect(
        component.queryByTestId('ChatRetryNotice'),
      ).not.toBeInTheDocument();
    });
  });

  // Auto-scroll behavior. jsdom has no layout engine and no real scrollIntoView,
  // so we can't assert pixel positions (see Recharts/jsdom caveat). Instead we
  // spy on scrollIntoView and drive the message prop through a stateful harness
  // (so the component — and its refs — persist across updates) to assert the
  // event-driven triggers: user-send, first assistant token, and the guards.
  describe('auto-scroll behavior', () => {
    let scrollIntoView: ReturnType<typeof vi.fn<Element['scrollIntoView']>>;

    beforeEach(() => {
      scrollIntoView = vi.fn<Element['scrollIntoView']>();
      Element.prototype.scrollIntoView = scrollIntoView;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    /**
     * Render {@link ChatThread} inside a harness whose `messages` are stateful,
     * so a single mounted instance survives updates and its scroll-tracking refs
     * carry over between renders (a fresh render would reset them).
     */
    const renderControllable = (
      initial: readonly ChatMessage[],
    ): {
      readonly result: RenderResult;
      readonly update: (next: readonly ChatMessage[]) => void;
    } => {
      const setter: { current: (next: readonly ChatMessage[]) => void } = {
        current: () => {},
      };
      // eslint-disable-next-line react/no-multi-comp -- test-local stateful harness
      const Harness = (): React.ReactElement => {
        const [messages, setMessages] =
          React.useState<readonly ChatMessage[]>(initial);
        setter.current = setMessages;
        return <ChatThread messages={messages} />;
      };
      const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);
      const result = render(<RoutesStub />);
      const update = (next: readonly ChatMessage[]): void => {
        act(() => {
          setter.current(next);
        });
      };
      return { result, update };
    };

    test('should not scroll when the thread is empty', () => {
      renderThread({ messages: [] });
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    test('should jump to the bottom on the first non-empty paint', () => {
      renderThread({
        messages: [{ body: 'Hello', id: '1', role: 'user' }],
      });
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto' });
    });

    test('should scroll when a new user message is appended', () => {
      const { update } = renderControllable([
        { body: 'Earlier reply', id: 'a0', role: 'assistant' },
      ]);
      // First paint already jumped; only assert the append-driven scroll.
      scrollIntoView.mockClear();

      update([
        { body: 'Earlier reply', id: 'a0', role: 'assistant' },
        { body: 'New question', id: 'u1', role: 'user' },
      ]);

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    test('should scroll once when the assistant streams its first token', () => {
      const { update } = renderControllable([
        { body: 'Question', id: 'u1', role: 'user' },
        { body: '', id: 'a1', pending: true, role: 'assistant' },
      ]);
      scrollIntoView.mockClear();

      // First token: empty/pending → non-empty body on the same assistant id.
      update([
        { body: 'Question', id: 'u1', role: 'user' },
        { body: 'Hel', id: 'a1', role: 'assistant' },
      ]);

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    test('should not scroll again as the same assistant turn keeps streaming', () => {
      const { update } = renderControllable([
        { body: 'Question', id: 'u1', role: 'user' },
        { body: '', id: 'a1', pending: true, role: 'assistant' },
      ]);
      scrollIntoView.mockClear();

      update([
        { body: 'Question', id: 'u1', role: 'user' },
        { body: 'Hel', id: 'a1', role: 'assistant' },
      ]);
      expect(scrollIntoView).toHaveBeenCalledTimes(1);

      // Subsequent tokens grow the body but keep the id → no further scroll.
      update([
        { body: 'Question', id: 'u1', role: 'user' },
        { body: 'Hello world, here is more', id: 'a1', role: 'assistant' },
      ]);
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    });

    test('should suppress the first-response scroll when scrolled up, but still scroll on user-send', () => {
      const { result, update } = renderControllable([
        { body: 'Question', id: 'u1', role: 'user' },
        { body: '', id: 'a1', pending: true, role: 'assistant' },
      ]);
      scrollIntoView.mockClear();

      // Simulate the user scrolling up past the near-bottom threshold. jsdom has
      // no layout, so stub the container geometry, then fire a scroll event to
      // update the internal near-bottom ref.
      const container = within(result.container).getByTestId('ChatThread');
      Object.defineProperty(container, 'scrollHeight', {
        configurable: true,
        value: 1000,
      });
      Object.defineProperty(container, 'clientHeight', {
        configurable: true,
        value: 300,
      });
      Object.defineProperty(container, 'scrollTop', {
        configurable: true,
        value: 0,
      });
      act(() => {
        container.dispatchEvent(new Event('scroll'));
      });

      // First assistant token while scrolled up → suppressed.
      update([
        { body: 'Question', id: 'u1', role: 'user' },
        { body: 'Reply', id: 'a1', role: 'assistant' },
      ]);
      expect(scrollIntoView).not.toHaveBeenCalled();

      // A new user message still yanks to the bottom regardless of scroll state.
      update([
        { body: 'Question', id: 'u1', role: 'user' },
        { body: 'Reply', id: 'a1', role: 'assistant' },
        { body: 'Follow-up', id: 'u2', role: 'user' },
      ]);
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });
  });

  describe('when a cursor startup failure arrives as a system message', () => {
    // The exact text the server composes (conversation-stream.copy.ts). It
    // reaches the UI as a plain system-message body — there is no typed field
    // on the terminal chunk to branch on — so this pins that the actionable
    // copy actually renders, and that the turn stays retryable.
    const authRequiredCopy =
      'Your cursor-agent login has expired or is unavailable. Run `cursor-agent login` in a terminal, then send this message again.\n\nDetails: Error: Authentication required.';
    const notInstalledCopy =
      'cursor-agent is not installed, or is not on this server’s PATH. Install it with `curl https://cursor.com/install -fsS | bash`, or set OPENTHROTTLE_CURSOR_AGENT_BIN to its full path.';
    const timeoutCopy =
      'cursor-agent did not start in time. This is usually a cold start — send the message again and it will normally succeed.';

    test('should render the auth-required copy with its next step', async () => {
      component = renderThread({
        ...props,
        messages: [
          { body: 'hi', id: '1', role: 'user' },
          { body: authRequiredCopy, id: '2', role: 'system' },
        ],
      });
      await component.findByTestId('MarkdownRenderer');

      const thread = within(component.container).getByTestId('ChatThread');
      // The body renders as markdown, so the backticked command lands in its
      // own <code> — the next step is visually distinct, not buried in prose.
      expect(
        within(thread).getByText('cursor-agent login', { selector: 'code' }),
      ).toBeInTheDocument();
      // The raw cursor message is preserved for diagnostics.
      expect(
        within(thread).getByText(/Authentication required/),
      ).toBeInTheDocument();
    });

    test('should render the not-installed copy naming how to fix it', () => {
      component = renderThread({
        ...props,
        messages: [{ body: notInstalledCopy, id: '1', role: 'system' }],
      });

      const thread = within(component.container).getByTestId('ChatThread');
      expect(within(thread).getByText(/not installed/)).toBeInTheDocument();
      expect(
        within(thread).getByText(/OPENTHROTTLE_CURSOR_AGENT_BIN/),
      ).toBeInTheDocument();
    });

    test('should render the timeout copy as a cold start worth retrying', () => {
      component = renderThread({
        ...props,
        canRetry: true,
        messages: [{ body: timeoutCopy, id: '1', role: 'system' }],
        onRetry: vi.fn(),
      });

      const thread = within(component.container).getByTestId('ChatThread');
      expect(within(thread).getByText(/cold start/)).toBeInTheDocument();
      // A dead thread would be the failure mode; the turn stays retryable.
      expect(
        within(component.container).getByTestId('ChatRetryNotice'),
      ).toBeInTheDocument();
    });
  });
});
