import * as React from 'react';
import { render } from '@testing-library/react';
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
      expect(component.getByText('Assistant')).toBeInTheDocument();
    });

    test('should render assistant content in Markdown wrapper', () => {
      expect(component.getByTestId('ChatThread-message-2')).toBeInTheDocument();
      expect(
        component
          .getByTestId('ChatThread-message-2')
          .querySelector('.markdown'),
      ).toBeInTheDocument();
    });
  });

  describe('when assistant message has markdown-like body', () => {
    test('should render assistant body via Markdown', () => {
      const markdownMessages: readonly ChatMessage[] = [
        { body: '# Title', id: 'a1', role: 'assistant' },
      ];
      component = renderThread({ messages: markdownMessages });
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

  // Auto-scroll guards. jsdom has no layout engine and no real scrollIntoView,
  // so we can't assert pixel positions (see Recharts/jsdom caveat). Instead we
  // spy on scrollIntoView and assert the effect's guards: skip the no-op scroll
  // on an empty thread, and jump to the bottom on the first non-empty paint.
  describe('auto-scroll effect guards', () => {
    let scrollIntoView: ReturnType<typeof vi.fn<Element['scrollIntoView']>>;

    beforeEach(() => {
      scrollIntoView = vi.fn<Element['scrollIntoView']>();
      Element.prototype.scrollIntoView = scrollIntoView;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

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
  });
});
