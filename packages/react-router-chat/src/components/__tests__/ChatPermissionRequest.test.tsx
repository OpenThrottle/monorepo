import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import { ChatPermissionResponderContext } from '../../data/data.chat-permission-responder-context';
import type {
  ChatPermissionResponder,
  ChatTurnPermissionEvent,
} from '../../types';
import { ChatPermissionRequest } from '../ChatPermissionRequest';

const pending: ChatTurnPermissionEvent = {
  kind: 'permission',
  options: [
    { kind: 'allow_once', name: 'Allow', optionId: 'yes' },
    { kind: 'reject_once', name: 'Reject', optionId: 'no' },
  ],
  requestId: 'r1',
  resolution: null,
  sortOrder: 1,
  toolKind: 'execute',
  toolTitle: 'rm -rf build',
};

const renderCard = (
  event: ChatTurnPermissionEvent,
  respond?: ChatPermissionResponder,
): RenderResult => {
  const Comp = (): React.ReactElement => {
    return (
      <ChatPermissionResponderContext.Provider value={respond}>
        <ChatPermissionRequest event={event} />
      </ChatPermissionResponderContext.Provider>
    );
  };
  const RoutesStub = createRoutesStub([{ Component: Comp, path: '/' }]);

  return render(<RoutesStub />);
};

describe('ChatPermissionRequest Component', () => {
  describe('when pending', () => {
    test('shows the tool title and one button per option', () => {
      const component = renderCard(pending, vi.fn());

      expect(component.getByText('rm -rf build')).toBeInTheDocument();
      expect(component.getAllByRole('button')).toHaveLength(2);
    });

    test('answers with the pressed option and locks the buttons', async () => {
      const respond = vi.fn();
      const component = renderCard(pending, respond);

      await userEvent.click(component.getByRole('button', { name: 'Allow' }));

      expect(respond).toHaveBeenCalledWith('r1', 'yes');
      expect(component.getByRole('button', { name: 'Reject' })).toBeDisabled();
    });

    test('disables the buttons without a responder', () => {
      const component = renderCard(pending);

      expect(component.getByRole('button', { name: 'Allow' })).toBeDisabled();
    });
  });

  describe('when resolved', () => {
    test('replaces the buttons with the outcome', () => {
      const component = renderCard(
        {
          ...pending,
          resolution: { optionId: 'yes', outcome: 'selected' },
        },
        vi.fn(),
      );

      expect(component.queryAllByRole('button')).toHaveLength(0);
      expect(
        component.getByTestId('ChatPermissionRequest-outcome'),
      ).toHaveTextContent('Allow');
    });
  });
});
