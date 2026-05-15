import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
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
      expect(component.getByText('# Title')).toBeInTheDocument();
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
});
