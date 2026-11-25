import { AGENT_CONVERSATIONS_ACTION } from '@openthrottle/react-router-chat';
import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useLocation } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';

import { CONVERSATION_DOCK_COPY } from '~/global/data/copy';
import type { ChatDockState } from '~/global/utils/chat-dock-cookie';
import { parseChatDockCookie } from '~/global/utils/chat-dock-cookie';

import { GlobalConversationDock } from '../GlobalConversationDock';

const CONVERSATION = {
  groupId: null,
  id: 'c1',
  pinned: false,
  status: 'active',
  title: 'Size of the OT database',
  updatedAt: '2026-11-25T12:00:00.000Z',
};

const LocationProbe = (): React.ReactElement => {
  const location = useLocation();
  return (
    <output data-testid="location">{`${location.pathname}${location.search}`}</output>
  );
};

const renderDock = (
  initialState: ChatDockState,
  path = '/plans',
): RenderResult => {
  const Stub = createRoutesStub([
    {
      // eslint-disable-next-line react/no-multi-comp -- inline route component composing the dock and a location probe
      Component: (): React.ReactElement => (
        <>
          <GlobalConversationDock enabled={true} initialState={initialState} />
          <LocationProbe />
        </>
      ),
      path: '*',
    },
    {
      action: async ({ request }: { request: Request }) => {
        const intent = (await request.formData()).get('intent');
        if (intent === 'list-groups') {
          return { errorMessage: null, groups: [] };
        }
        return {
          conversations: [CONVERSATION],
          errorMessage: null,
          totalCount: 1,
        };
      },
      path: AGENT_CONVERSATIONS_ACTION,
    },
  ]);

  return render(<Stub initialEntries={[path]} />);
};

describe('GlobalConversationDock', () => {
  afterEach(() => {
    document.cookie = 'ot_chat_dock=; path=/; max-age=0';
  });

  describe('when open', () => {
    test('lists the conversations on any route', async () => {
      const component = renderDock({ collapsedGroupIds: [], isOpen: true });

      expect(
        component.getByRole('complementary', {
          name: CONVERSATION_DOCK_COPY.region,
        }),
      ).toBeInTheDocument();
      expect(
        await component.findByText(CONVERSATION.title),
      ).toBeInTheDocument();
    });

    test('picking a chat goes to the chat route with it', async () => {
      const component = renderDock({ collapsedGroupIds: [], isOpen: true });
      const user = userEvent.setup();

      await user.click(
        await component.findByTestId('ChatConversationSidebar-select-c1'),
      );

      await waitFor(() => {
        expect(component.getByTestId('location')).toHaveTextContent(
          '/?conversationId=c1',
        );
      });
    });

    test('collapsing shows the rail and remembers it in the cookie', async () => {
      const component = renderDock({ collapsedGroupIds: [], isOpen: true });
      const user = userEvent.setup();

      await user.click(
        component.getByTestId('GlobalConversationDock-collapse'),
      );

      expect(
        component.getByTestId('GlobalConversationDock-rail'),
      ).toBeInTheDocument();
      expect(parseChatDockCookie(document.cookie).isOpen).toBe(false);
    });
  });

  describe('when collapsed', () => {
    test('renders only the rail, whose button reopens the column', async () => {
      const component = renderDock({ collapsedGroupIds: [], isOpen: false });
      const user = userEvent.setup();

      expect(component.queryByRole('complementary')).not.toBeInTheDocument();

      await user.click(component.getByTestId('GlobalConversationDock-show'));

      expect(
        component.getByRole('complementary', {
          name: CONVERSATION_DOCK_COPY.region,
        }),
      ).toBeInTheDocument();
    });

    test('⌘. toggles it open', async () => {
      const component = renderDock({ collapsedGroupIds: [], isOpen: false });
      const user = userEvent.setup();

      await user.keyboard('{Meta>}.{/Meta}');

      expect(
        component.getByRole('complementary', {
          name: CONVERSATION_DOCK_COPY.region,
        }),
      ).toBeInTheDocument();
    });
  });
});
