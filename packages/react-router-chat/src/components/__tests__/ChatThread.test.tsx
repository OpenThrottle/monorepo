import * as React from 'react';
import { act, render, waitFor, within } from '@testing-library/react';
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

  // Pin-to-bottom behavior. jsdom has no layout engine, so we stub the
  // scroller geometry (scrollHeight/clientHeight) and let the component write
  // scrollTop — that write is the observable signal that the view followed the
  // bottom. Messages are driven through a stateful harness so a single mounted
  // instance (and its pin state) survives updates.
  describe('pin-to-bottom behavior', () => {
    const SCROLL_HEIGHT = 1000;
    const CLIENT_HEIGHT = 300;

    /** Give an element the geometry of a scroller that is 700px overscrolled. */
    const stubGeometry = (element: HTMLElement): void => {
      Object.defineProperty(element, 'scrollHeight', {
        configurable: true,
        value: SCROLL_HEIGHT,
      });
      Object.defineProperty(element, 'clientHeight', {
        configurable: true,
        value: CLIENT_HEIGHT,
      });
      let scrollTop = 0;
      Object.defineProperty(element, 'scrollTop', {
        configurable: true,
        get: () => scrollTop,
        set: (next: number) => {
          scrollTop = next;
        },
      });
    };

    const scrollTo = (element: HTMLElement, top: number): void => {
      act(() => {
        element.scrollTop = top;
        element.dispatchEvent(new Event('scroll'));
      });
    };

    /**
     * Render {@link ChatThread} inside a harness whose `messages` are stateful,
     * so a single mounted instance survives updates and its pin state carries
     * over between renders (a fresh render would reset it).
     */
    const renderControllable = (
      initial: readonly ChatMessage[],
      extra: Partial<ChatThreadProps> = {},
    ): {
      readonly pinned: { current: boolean };
      readonly result: RenderResult;
      readonly update: (next: readonly ChatMessage[]) => void;
    } => {
      const setter: { current: (next: readonly ChatMessage[]) => void } = {
        current: () => {},
      };
      const pinned = { current: true };
      // eslint-disable-next-line react/no-multi-comp -- test-local stateful harness
      const Harness = (): React.ReactElement => {
        const [messages, setMessages] =
          React.useState<readonly ChatMessage[]>(initial);
        setter.current = setMessages;
        return (
          <ChatThread
            {...extra}
            messages={messages}
            onPinnedChange={(next) => {
              pinned.current = next;
            }}
          />
        );
      };
      const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);
      const result = render(<RoutesStub />);
      const update = (next: readonly ChatMessage[]): void => {
        act(() => {
          setter.current(next);
        });
      };
      return { pinned, result, update };
    };

    test('follows the bottom as the assistant streams', async () => {
      const { result, update } = renderControllable([
        { body: 'Question', id: 'u1', role: 'user' },
        { body: '', id: 'a1', pending: true, role: 'assistant' },
      ]);
      const thread = within(result.container).getByTestId('ChatThread');
      stubGeometry(thread);

      update([
        { body: 'Question', id: 'u1', role: 'user' },
        { body: 'Hel', id: 'a1', role: 'assistant' },
      ]);

      // MutationObserver callbacks are microtask-scheduled.
      await waitFor(() => {
        expect(thread.scrollTop).toBe(SCROLL_HEIGHT);
      });
    });

    test('a user scroll away from the bottom unpins', () => {
      const { pinned, result } = renderControllable([
        { body: 'Question', id: 'u1', role: 'user' },
      ]);
      const thread = within(result.container).getByTestId('ChatThread');
      stubGeometry(thread);

      scrollTo(thread, 0);

      expect(pinned.current).toBe(false);
    });

    test('a small scroll inside the near-bottom threshold keeps the pin', () => {
      const { pinned, result } = renderControllable([
        { body: 'Question', id: 'u1', role: 'user' },
      ]);
      const thread = within(result.container).getByTestId('ChatThread');
      stubGeometry(thread);

      // 40px from the bottom — inside NEAR_BOTTOM_THRESHOLD_PX (64).
      scrollTo(thread, SCROLL_HEIGHT - CLIENT_HEIGHT - 40);

      expect(pinned.current).toBe(true);
    });

    test('scrolling back to the bottom re-pins', () => {
      const { pinned, result } = renderControllable([
        { body: 'Question', id: 'u1', role: 'user' },
      ]);
      const thread = within(result.container).getByTestId('ChatThread');
      stubGeometry(thread);

      scrollTo(thread, 0);
      expect(pinned.current).toBe(false);

      scrollTo(thread, SCROLL_HEIGHT - CLIENT_HEIGHT);
      expect(pinned.current).toBe(true);
    });

    test('a streaming scroll never unpins the view', async () => {
      const { pinned, result, update } = renderControllable([
        { body: 'Question', id: 'u1', role: 'user' },
        { body: '', id: 'a1', pending: true, role: 'assistant' },
      ]);
      const thread = within(result.container).getByTestId('ChatThread');
      stubGeometry(thread);

      update([
        { body: 'Question', id: 'u1', role: 'user' },
        { body: 'Streaming reply', id: 'a1', role: 'assistant' },
      ]);
      await waitFor(() => {
        expect(thread.scrollTop).toBe(SCROLL_HEIGHT);
      });
      // The programmatic jump emits its own scroll event; it must be ignored.
      act(() => {
        thread.dispatchEvent(new Event('scroll'));
      });

      expect(pinned.current).toBe(true);
    });

    test('sending a message re-pins a thread the user had scrolled away from', () => {
      const { pinned, result, update } = renderControllable([
        { body: 'Question', id: 'u1', role: 'user' },
        { body: 'Reply', id: 'a1', role: 'assistant' },
      ]);
      const thread = within(result.container).getByTestId('ChatThread');
      stubGeometry(thread);

      scrollTo(thread, 0);
      expect(pinned.current).toBe(false);

      update([
        { body: 'Question', id: 'u1', role: 'user' },
        { body: 'Reply', id: 'a1', role: 'assistant' },
        { body: 'Follow-up', id: 'u2', role: 'user' },
      ]);

      expect(pinned.current).toBe(true);
      expect(thread.scrollTop).toBe(SCROLL_HEIGHT);
    });

    test('the repin callback jumps to the bottom and re-engages following', () => {
      const repinRef: React.RefObject<(() => void) | null> = { current: null };
      const { pinned, result } = renderControllable(
        [{ body: 'Question', id: 'u1', role: 'user' }],
        { repinRef },
      );
      const thread = within(result.container).getByTestId('ChatThread');
      stubGeometry(thread);

      scrollTo(thread, 0);
      expect(pinned.current).toBe(false);

      act(() => {
        repinRef.current?.();
      });

      expect(pinned.current).toBe(true);
      expect(thread.scrollTop).toBe(SCROLL_HEIGHT);
    });

    describe('when an external element owns the scroll', () => {
      // The developer home route: the page layout scrolls, not the thread. The
      // old ref-based guard listened to the thread's own onScroll, which never
      // fires there — so the scrolled-away check was dead.
      const renderExternal = (): {
        readonly pinned: { current: boolean };
        readonly scroller: HTMLElement;
      } => {
        const scroller = document.createElement('div');
        document.body.appendChild(scroller);
        stubGeometry(scroller);
        const { pinned } = renderControllable(
          [
            { body: 'Question', id: 'u1', role: 'user' },
            { body: '', id: 'a1', pending: true, role: 'assistant' },
          ],
          { getScrollElement: () => scroller },
        );
        return { pinned, scroller };
      };

      afterEach(() => {
        document.body.innerHTML = '';
      });

      test('follows the external scroller on mount', () => {
        const { scroller } = renderExternal();
        expect(scroller.scrollTop).toBe(SCROLL_HEIGHT);
      });

      test('a scroll on the external container unpins', () => {
        const { pinned, scroller } = renderExternal();

        scrollTo(scroller, 0);

        expect(pinned.current).toBe(false);
      });

      test("the thread's own element no longer drives the pin state", () => {
        const { pinned } = renderExternal();
        const thread = within(document.body).getAllByTestId('ChatThread')[0];
        if (thread === undefined) {
          throw new Error('expected a rendered thread');
        }
        stubGeometry(thread);

        scrollTo(thread, 0);

        expect(pinned.current).toBe(true);
      });
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
