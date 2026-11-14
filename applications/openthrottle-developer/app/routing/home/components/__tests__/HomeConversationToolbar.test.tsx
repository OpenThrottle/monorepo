import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { UseConversationListResult } from '~/routing/home/hooks/useConversationList';

import type { HomeConversationToolbarProps } from '../HomeConversationToolbar';
import { HomeConversationToolbar } from '../HomeConversationToolbar';

const buildConversationList = (): UseConversationListResult => {
  return {
    conversations: [],
    errorMessage: null,
    isLoading: false,
    isLoadingMore: false,
    loadMore: vi.fn(),
    refresh: vi.fn(),
    remove: vi.fn(),
    rename: vi.fn(),
    totalCount: 0,
  };
};

const renderToolbar = (props: HomeConversationToolbarProps): RenderResult => {
  const Component = (): React.ReactElement => {
    return (
      <TooltipProvider>
        <HomeConversationToolbar {...props} />
      </TooltipProvider>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('HomeConversationToolbar Component', () => {
  let component: RenderResult;
  let props: HomeConversationToolbarProps;

  beforeEach(() => {
    props = {
      activeConversationId: null,
      conversationList: buildConversationList(),
      onNewChat: vi.fn(),
      onSelectConversation: vi.fn(),
    };

    component = renderToolbar(props);
  });

  test('renders the conversation-sheet strip', () => {
    expect(
      component.getByTestId('home-conversation-toolbar'),
    ).toBeInTheDocument();
  });

  test('renders the sheet trigger', () => {
    expect(component.getByRole('button')).toBeInTheDocument();
  });

  describe('when the list failed to load', () => {
    test('shows the failure instead of the empty state, and opening the sheet retries', async () => {
      const conversationList: UseConversationListResult = {
        ...buildConversationList(),
        errorMessage: 'Missing permission: settings:read',
      };
      component.unmount();
      component = renderToolbar({ ...props, conversationList });

      await userEvent.setup().click(component.getByRole('button'));

      expect(conversationList.refresh).toHaveBeenCalledTimes(1);
      expect(component.getByRole('alert')).toHaveTextContent(
        'Missing permission: settings:read',
      );
      expect(
        component.queryByTestId('ChatConversationSidebar-empty'),
      ).not.toBeInTheDocument();
    });
  });
});
