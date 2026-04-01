import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { MessageDetail } from '../MessageDetail';
import type { MessageDetailProps } from '../MessageDetail';
import type { MailMessageDetail } from '~/types/mail';

const createMessage = (
  overrides?: Partial<MailMessageDetail>,
): MailMessageDetail => ({
  body: 'Test body',
  date: '2025-01-01 12:00',
  from: 'from@example.com',
  id: 'msg-1',
  subject: 'Test subject',
  to: 'to@example.com',
  ...overrides,
});

describe('MessageDetail Component', () => {
  let component: RenderResult;
  let props: MessageDetailProps;

  const renderComponent = (overrides: Partial<MessageDetailProps> = {}) => {
    const merged = { ...props, ...overrides };
    const Component = () => (
      <TooltipProvider>
        <MessageDetail {...merged} />
      </TooltipProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {};
  });

  describe('when message is null', () => {
    test('shows empty state', () => {
      component = renderComponent({ message: null });
      expect(component.getByText('Select a message')).toBeInTheDocument();
    });
  });

  describe('when loading is true', () => {
    test('renders skeleton elements', () => {
      component = renderComponent({ loading: true });
      expect(
        component.getByTestId('MessageDetail-skeleton-title'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('MessageDetail-skeleton-description'),
      ).toBeInTheDocument();
    });
  });

  describe('when message is provided', () => {
    beforeEach(() => {
      props = { message: createMessage() };
    });

    test('renders subject and body', () => {
      component = renderComponent();
      expect(component.getByText('Test subject')).toBeInTheDocument();
      expect(component.getByText('Test body')).toBeInTheDocument();
    });

    test('renders action buttons with data-testid', () => {
      component = renderComponent();
      expect(
        component.getByTestId('MessageDetail-action-reply'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('MessageDetail-action-reply-all'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('MessageDetail-action-forward'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('MessageDetail-action-archive'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('MessageDetail-action-delete'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('MessageDetail-action-more'),
      ).toBeInTheDocument();
    });
  });

  describe('when message has attachments', () => {
    test('renders attachments section', () => {
      component = renderComponent({
        message: createMessage({
          attachments: [{ name: 'file.pdf' }, { name: 'image.png' }],
        }),
      });
      expect(
        component.getByTestId('MessageDetail-attachments'),
      ).toBeInTheDocument();
      expect(component.getByText('file.pdf')).toBeInTheDocument();
      expect(component.getByText('image.png')).toBeInTheDocument();
    });
  });
});
