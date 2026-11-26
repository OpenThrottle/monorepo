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

  describe('the toggle shortcut', () => {
    test('Ctrl+J with Caps Lock (an upper-case J) collapses the open column', async () => {
      const component = renderDock({ collapsedGroupIds: [], isOpen: true });
      const user = userEvent.setup();

      await user.keyboard('{Control>}J{/Control}');

      expect(
        component.getByTestId('GlobalConversationDock-rail'),
      ).toBeInTheDocument();
    });

    test('the old ⌘. binding no longer toggles', async () => {
      const component = renderDock({ collapsedGroupIds: [], isOpen: false });
      const user = userEvent.setup();

      await user.keyboard('{Meta>}.{/Meta}');

      expect(component.queryByRole('complementary')).not.toBeInTheDocument();
    });
  });

  describe('the open column’s edge strip', () => {
    test('collapses the column when clicked', async () => {
      const component = renderDock({ collapsedGroupIds: [], isOpen: true });
      const user = userEvent.setup();

      await user.click(component.getByTestId('GlobalConversationDock-edge'));

      expect(
        component.getByTestId('GlobalConversationDock-rail'),
      ).toBeInTheDocument();
      expect(parseChatDockCookie(document.cookie).isOpen).toBe(false);
    });

    test('is not rendered while collapsed', () => {
      const component = renderDock({ collapsedGroupIds: [], isOpen: false });

      expect(
        component.queryByTestId('GlobalConversationDock-edge'),
      ).not.toBeInTheDocument();
    });
  });

  describe('the toggle icon', () => {
    test('is filled while open', () => {
      const component = renderDock({ collapsedGroupIds: [], isOpen: true });

      expect(
        component.getByTestId('GlobalConversationDock-icon-open'),
      ).toHaveClass('fill-current');
    });

    test('is outlined while collapsed', () => {
      const component = renderDock({ collapsedGroupIds: [], isOpen: false });

      expect(
        component.getByTestId('GlobalConversationDock-icon-closed'),
      ).not.toHaveClass('fill-current');
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

    test('a click anywhere on the rail opens the column', async () => {
      const component = renderDock({ collapsedGroupIds: [], isOpen: false });
      const user = userEvent.setup();

      await user.click(component.getByTestId('GlobalConversationDock-rail'));

      expect(
        component.getByRole('complementary', {
          name: CONVERSATION_DOCK_COPY.region,
        }),
      ).toBeInTheDocument();
    });

    test('the rail is a single labelled button', () => {
      const component = renderDock({ collapsedGroupIds: [], isOpen: false });
      const rail = component.getByTestId('GlobalConversationDock-rail');

      expect(
        component.getByRole('button', { name: CONVERSATION_DOCK_COPY.show }),
      ).toBe(component.getByTestId('GlobalConversationDock-show'));
      expect(rail.querySelectorAll('button')).toHaveLength(1);
    });

    test('⌘J toggles it open', async () => {
      const component = renderDock({ collapsedGroupIds: [], isOpen: false });
      const user = userEvent.setup();

      await user.keyboard('{Meta>}j{/Meta}');

      expect(
        component.getByRole('complementary', {
          name: CONVERSATION_DOCK_COPY.region,
        }),
      ).toBeInTheDocument();
    });
  });
});
