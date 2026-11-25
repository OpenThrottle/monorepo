import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import {
  AGENT_CONVERSATION_GROUP_INTENTS,
  AGENT_CONVERSATIONS_ACTION,
} from '../../data/chat-conversation-actions';
import type { AgentConversationListItem } from '../../types';
import type { UseConversationGroupsResult } from '../useConversationGroups';
import { useConversationGroups } from '../useConversationGroups';

const GROUP = { id: 'g1', name: 'Launch prep', sortOrder: 1000 };

const CONVERSATION: AgentConversationListItem = {
  groupId: null,
  id: 'c1',
  pinned: true,
  status: 'active',
  title: 'Chat',
  updatedAt: '2026-11-25T12:00:00.000Z',
};

type MapConversations = (
  update: (
    conversation: AgentConversationListItem,
  ) => AgentConversationListItem,
) => void;

interface HarnessProps {
  readonly mapConversations: MapConversations;
  readonly onRender: (result: UseConversationGroupsResult) => void;
}

function Harness(props: HarnessProps): React.ReactElement {
  const { mapConversations, onRender } = props;
  const groups = useConversationGroups({ enabled: true, mapConversations });

  React.useEffect(() => {
    onRender(groups);
  });

  return (
    <div>
      <button onClick={() => groups.createGroup('Probes', 'c1')} type="button">
        create
      </button>
      <button onClick={() => groups.moveToGroup('c1', 'g1')} type="button">
        move
      </button>
      <button onClick={() => groups.deleteGroup('g1')} type="button">
        delete
      </button>
    </div>
  );
}

const renderGroups = (
  action: (intent: FormDataEntryValue | null, body: FormData) => unknown,
  mapConversations: MapConversations,
): {
  readonly component: RenderResult;
  readonly latest: { current: UseConversationGroupsResult | null };
} => {
  const latest: { current: UseConversationGroupsResult | null } = {
    current: null,
  };
  const Stub = createRoutesStub([
    {
      // eslint-disable-next-line react/no-multi-comp -- inline route component composing the module-level Harness
      Component: (): React.ReactElement => (
        <Harness
          mapConversations={mapConversations}
          onRender={(result) => {
            latest.current = result;
          }}
        />
      ),
      path: '/',
    },
    {
      action: async ({ request }: { request: Request }) => {
        const body = await request.formData();
        return action(body.get('intent'), body);
      },
      path: AGENT_CONVERSATIONS_ACTION,
    },
  ]);
  const component = render(<Stub initialEntries={['/']} />);

  return { component, latest };
};

const applyLast = (
  mapConversations: ReturnType<typeof vi.fn<MapConversations>>,
  row: AgentConversationListItem,
): AgentConversationListItem | null => {
  const update = mapConversations.mock.calls.at(-1)?.[0];
  return update ? update(row) : null;
};

describe('useConversationGroups', () => {
  test('loads the groups on mount', async () => {
    const { latest } = renderGroups((intent) => {
      expect(intent).toBe(AGENT_CONVERSATION_GROUP_INTENTS.LIST_GROUPS);
      return { errorMessage: null, groups: [GROUP] };
    }, vi.fn());

    await waitFor(() => {
      expect(latest.current?.groups).toEqual([GROUP]);
    });
  });

  test('moving into a group updates the row at once and unpins it', async () => {
    const mapConversations = vi.fn<MapConversations>();
    const posted: string[] = [];
    const { component } = renderGroups((intent, body) => {
      posted.push(String(intent));
      if (intent === AGENT_CONVERSATION_GROUP_INTENTS.MOVE_TO_GROUP) {
        expect(body.get('groupId')).toBe('g1');
      }
      return { errorMessage: null, groups: [GROUP] };
    }, mapConversations);
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'move' }));

    expect(applyLast(mapConversations, CONVERSATION)).toMatchObject({
      groupId: 'g1',
      pinned: false,
    });
    await waitFor(() => {
      expect(posted).toContain(AGENT_CONVERSATION_GROUP_INTENTS.MOVE_TO_GROUP);
    });
  });

  test('a created group is appended and its moved conversation applied', async () => {
    const mapConversations = vi.fn<MapConversations>();
    const created = { id: 'g2', name: 'Probes', sortOrder: 2000 };
    const { component, latest } = renderGroups((intent) => {
      if (intent === AGENT_CONVERSATION_GROUP_INTENTS.CREATE_GROUP) {
        return {
          conversation: { ...CONVERSATION, groupId: 'g2', pinned: false },
          errorMessage: null,
          group: created,
        };
      }
      return { errorMessage: null, groups: [GROUP] };
    }, mapConversations);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(latest.current?.groups).toHaveLength(1);
    });
    await user.click(component.getByRole('button', { name: 'create' }));

    await waitFor(() => {
      expect(latest.current?.groups).toEqual([GROUP, created]);
    });
    expect(applyLast(mapConversations, CONVERSATION)).toMatchObject({
      groupId: 'g2',
    });
  });

  test('deleting a group removes it and releases its conversations', async () => {
    const mapConversations = vi.fn<MapConversations>();
    const { component, latest } = renderGroups(() => {
      return { errorMessage: null, group: GROUP, groups: [GROUP] };
    }, mapConversations);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(latest.current?.groups).toHaveLength(1);
    });
    await user.click(component.getByRole('button', { name: 'delete' }));

    expect(latest.current?.groups).toEqual([]);
    expect(
      applyLast(mapConversations, { ...CONVERSATION, groupId: 'g1' }),
    ).toMatchObject({ groupId: null });
  });
});
