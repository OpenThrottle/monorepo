import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MessageList } from '../MessageList';
import type { MessageListProps } from '../MessageList';
import { MAIL_FOLDER_IDS } from '~/types/mail';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

const mockMessages = [
  {
    date: '2025-01-01 12:00',
    from: 'sender@example.com',
    id: '1',
    read: false,
    subject: 'Test subject',
  },
  {
    date: '2025-01-02 08:30',
    from: 'other@example.com',
    id: '2',
    read: true,
    subject: 'Follow up',
  },
];

describe('MessageList Component', () => {
  let component: RenderResult;
  let props: MessageListProps;

  beforeEach(() => {
    props = {};

    const Component = () => <MessageList {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  afterEach(() => {
    cleanup();
  });

  test('renders default inbox empty state', () => {
    expect(component.getByText('No messages in Inbox')).toBeInTheDocument();
    expect(component.getByText('New messages will appear here.')).toBeInTheDocument();
  });

  describe('when messages is empty', () => {
    test('shows empty state with folder-specific copy for inbox', () => {
      cleanup();
      const testProps: MessageListProps = {
        folderId: MAIL_FOLDER_IDS.inbox,
        messages: [],
      };
      const TestComponent = () => <MessageList {...testProps} />;
      const RoutesStub = createRoutesStub([
        { Component: TestComponent, path: '/' },
      ]);
      const c = render(<RoutesStub />);
      expect(c.getByText('No messages in Inbox')).toBeInTheDocument();
      expect(c.getByText('New messages will appear here.')).toBeInTheDocument();
    });
  });

  describe('when messages provided', () => {
    test('renders table rows and message links to detail pages', () => {
      cleanup();
      const testProps: MessageListProps = { messages: mockMessages };
      const TestComponent = () => <MessageList {...testProps} />;
      const RoutesStub = createRoutesStub([
        { Component: TestComponent, path: '/' },
      ]);
      const c = render(<RoutesStub />);
      expect(c.getByTestId('MessageList')).toBeInTheDocument();
      expect(c.getByText('Test subject')).toBeInTheDocument();
      expect(c.getByText('Follow up')).toBeInTheDocument();
      expect(c.getByText('sender@example.com')).toBeInTheDocument();
      expect(c.getByRole('link', { name: 'Test subject' })).toHaveAttribute(
        'href',
        '/mail/inbox/1',
      );
    });
  });

  describe('when loading is true', () => {
    test('renders skeleton rows', () => {
      cleanup();
      const testProps: MessageListProps = { loading: true };
      const TestComponent = () => <MessageList {...testProps} />;
      const RoutesStub = createRoutesStub([
        { Component: TestComponent, path: '/' },
      ]);
      const c = render(<RoutesStub />);
      expect(c.getByTestId('MessageList')).toBeInTheDocument();
      expect(c.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('when selection is enabled', () => {
    test('select all triggers onSelectionChange with all ids', async () => {
      cleanup();
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      const testProps: MessageListProps = {
        messages: mockMessages,
        onSelectionChange,
      };
      const TestComponent = () => <MessageList {...testProps} />;
      const RoutesStub = createRoutesStub([
        { Component: TestComponent, path: '/' },
      ]);
      const c = render(<RoutesStub />);

      await user.click(c.getByRole('checkbox', { name: 'Select all' }));

      expect(onSelectionChange).toHaveBeenCalledOnce();
      expect(Array.from(onSelectionChange.mock.calls[0][0])).toEqual(['1', '2']);
    });

    test('row checkbox toggles a single id', async () => {
      cleanup();
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      const testProps: MessageListProps = {
        messages: mockMessages,
        onSelectionChange,
      };
      const TestComponent = () => <MessageList {...testProps} />;
      const RoutesStub = createRoutesStub([
        { Component: TestComponent, path: '/' },
      ]);
      const c = render(<RoutesStub />);

      await user.click(c.getByRole('checkbox', { name: 'Select Test subject' }));

      expect(onSelectionChange).toHaveBeenCalledOnce();
      expect(Array.from(onSelectionChange.mock.calls[0][0])).toEqual(['1']);
    });

    test('shows bulk actions for selected rows and clears selection', async () => {
      cleanup();
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      const selectedIds = new Set<string>(['1']);
      const testProps: MessageListProps = {
        messages: mockMessages,
        onSelectionChange,
        selectedIds,
      };
      const TestComponent = () => <MessageList {...testProps} />;
      const RoutesStub = createRoutesStub([
        { Component: TestComponent, path: '/' },
      ]);
      const c = render(<RoutesStub />);

      expect(c.getByTestId('MessageList-bulkActions')).toBeInTheDocument();
      expect(c.getByText('1 selected')).toBeInTheDocument();

      await user.click(c.getByRole('button', { name: 'Clear selection' }));

      expect(onSelectionChange).toHaveBeenCalledWith(new Set());
    });
  });
});
