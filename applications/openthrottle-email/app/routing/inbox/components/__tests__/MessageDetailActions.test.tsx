import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MessageDetailActions } from '../MessageDetailActions';
import type { MessageDetailActionsProps } from '../MessageDetailActions';
import type { MailMessageDetail } from '~/types/mail';

const message: MailMessageDetail = {
  body: 'Test body',
  date: '2025-01-01 12:00',
  from: 'from@example.com',
  id: 'msg-1',
  subject: 'Test subject',
  to: 'to@example.com',
};

describe('MessageDetailActions Component', () => {
  let component: RenderResult;
  let props: MessageDetailActionsProps;

  const renderComponent = (
    overrides: Partial<MessageDetailActionsProps> = {},
  ) => {
    const merged = { ...props, ...overrides };
    const Component = () => (
      <TooltipProvider>
        <MessageDetailActions {...merged} />
      </TooltipProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      message,
      onArchiveClick: vi.fn(),
      onDeleteClick: vi.fn(),
    };
  });

  test('renders Reply, Reply all, and Forward links to compose with the message id', () => {
    component = renderComponent();

    expect(component.getByTestId('MessageDetail-action-reply')).toHaveAttribute(
      'href',
      '/mail/compose?replyTo=msg-1',
    );
    expect(
      component.getByTestId('MessageDetail-action-reply-all'),
    ).toHaveAttribute('href', '/mail/compose?replyTo=msg-1&replyAll=1');
    expect(
      component.getByTestId('MessageDetail-action-forward'),
    ).toHaveAttribute('href', '/mail/compose?forward=msg-1');
  });

  test('calls onArchiveClick when Archive is clicked', async () => {
    const user = userEvent.setup();
    const onArchiveClick = vi.fn();
    component = renderComponent({ onArchiveClick });

    await user.click(component.getByTestId('MessageDetail-action-archive'));

    expect(onArchiveClick).toHaveBeenCalledTimes(1);
  });

  test('calls onDeleteClick when Delete is clicked', async () => {
    const user = userEvent.setup();
    const onDeleteClick = vi.fn();
    component = renderComponent({ onDeleteClick });

    await user.click(component.getByTestId('MessageDetail-action-delete'));

    expect(onDeleteClick).toHaveBeenCalledTimes(1);
  });

  test('renders the More trigger with an accessible label', () => {
    component = renderComponent();

    const more = component.getByTestId('MessageDetail-action-more');
    expect(more).toHaveAttribute('aria-label', 'More actions');
    expect(more.tagName).toBe('BUTTON');
  });
});
