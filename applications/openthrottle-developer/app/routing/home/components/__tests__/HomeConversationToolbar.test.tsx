import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { UseConversationListResult } from '~/routing/home/hooks/useConversationList';
import { HomeConversationToolbar } from '../HomeConversationToolbar';
import type { HomeConversationToolbarProps } from '../HomeConversationToolbar';

const buildConversationList = (): UseConversationListResult => ({
  conversations: [],
  isLoading: false,
  isLoadingMore: false,
  loadMore: vi.fn(),
  refresh: vi.fn(),
  remove: vi.fn(),
  rename: vi.fn(),
  totalCount: 0,
});

const renderToolbar = (props: HomeConversationToolbarProps): RenderResult => {
  const Component = (): React.ReactElement => (
    <TooltipProvider>
      <HomeConversationToolbar {...props} />
    </TooltipProvider>
  );
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
});
