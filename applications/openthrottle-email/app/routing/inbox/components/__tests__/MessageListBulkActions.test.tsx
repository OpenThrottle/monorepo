import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { MessageListBulkActions } from '../MessageListBulkActions';
import type { MessageListBulkActionsProps } from '../MessageListBulkActions';
import { MAIL_FOLDER_IDS } from '~/types/mail';

describe('MessageListBulkActions Component', () => {
  const renderComponent = (
    overrides: Partial<MessageListBulkActionsProps> = {},
  ): RenderResult => {
    const props: MessageListBulkActionsProps = {
      folderId: MAIL_FOLDER_IDS.inbox,
      onClearSelection: vi.fn(),
      onMoveToFolder: vi.fn(),
      onRequestDelete: vi.fn(),
      selectedCount: 2,
      ...overrides,
    };
    const Component = () => <MessageListBulkActions {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    return render(<RoutesStub />);
  };

  test('shows the "N selected" label', () => {
    const component = renderComponent({ selectedCount: 3 });
    expect(component.getByText('3 selected')).toBeInTheDocument();
  });

  test('calls onRequestDelete when Delete is clicked', async () => {
    const user = userEvent.setup();
    const onRequestDelete = vi.fn();
    const component = renderComponent({ onRequestDelete });

    await user.click(component.getByTestId('MessageList-bulkDelete'));

    expect(onRequestDelete).toHaveBeenCalledTimes(1);
  });

  test('calls onClearSelection when Clear selection is clicked', async () => {
    const user = userEvent.setup();
    const onClearSelection = vi.fn();
    const component = renderComponent({ onClearSelection });

    await user.click(
      component.getByRole('button', { name: 'Clear selection' }),
    );

    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  test('renders a disabled Mark read placeholder', () => {
    const component = renderComponent();
    expect(
      component.getByRole('button', { name: /mark read/i }),
    ).toBeDisabled();
  });

  test('More menu exposes a disabled Mark unread item and Move to folder trigger', async () => {
    const user = userEvent.setup();
    const component = renderComponent();

    await user.click(component.getByRole('button', { name: 'More' }));

    expect(component.getByText(/mark unread/i)).toBeInTheDocument();
    expect(
      component.getByTestId('MoveToFolderDropdown-trigger'),
    ).toHaveTextContent('Move to folder…');
  });
});
