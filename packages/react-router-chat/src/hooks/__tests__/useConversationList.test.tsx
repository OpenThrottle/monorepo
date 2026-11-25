import { Toaster } from '@openthrottle/react-router-shadcn';
import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { AGENT_CONVERSATIONS_ACTION } from '../../data/chat-conversation-actions';
import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../../data/chat-conversation-sidebar.copy';
import type { UseConversationListResult } from '../useConversationList';
import { useConversationList } from '../useConversationList';

function conversationsPage(
  offset: number,
  count: number,
): { id: string; title: string }[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `conv-${offset + index}`,
    title: `Conversation ${offset + index}`,
  }));
}

const RESTORED = {
  groupId: null,
  id: 'conv-restored',
  pinned: false,
  status: 'active',
  title: 'Restored',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

interface HarnessProps {
  readonly enabled: boolean;
  readonly onRender: (result: UseConversationListResult) => void;
}

function Harness({ enabled, onRender }: HarnessProps): React.ReactElement {
  const list = useConversationList({ enabled });

  React.useEffect(() => {
    onRender(list);
  });

  return (
    <div>
      <button data-testid="load-more" onClick={list.loadMore} type="button">
        Load more
      </button>
      <button data-testid="refresh" onClick={list.refresh} type="button">
        Refresh
      </button>
      <button
        data-testid="rename"
        onClick={() => list.rename('conv-0', 'Renamed')}
        type="button"
      >
        Rename
      </button>
      <button
        data-testid="remove"
        onClick={() => list.remove('conv-0')}
        type="button"
      >
        Remove
      </button>
      <button
        data-testid="restore"
        onClick={() => list.restore(RESTORED)}
        type="button"
      >
        Restore
      </button>
      <button
        data-testid="restore-listed"
        onClick={() => {
          const first = list.conversations[0];
          if (first) {
            list.restore(first);
          }
        }}
        type="button"
      >
        Restore listed
      </button>
      <ul data-testid="ids">
        {list.conversations.map((conversation) => (
          <li key={conversation.id}>{conversation.id}</li>
        ))}
      </ul>
    </div>
  );
}

function renderConversationList(
  action: (args: { request: Request }) => Promise<unknown> | unknown,
  pageLoader: (() => null) | undefined = undefined,
  enabled = true,
): {
  readonly getByTestId: (testId: string) => HTMLElement;
  readonly latest: { current: UseConversationListResult | null };
} {
  const latest: { current: UseConversationListResult | null } = {
    current: null,
  };

  const Stub = createRoutesStub([
    {
      // eslint-disable-next-line react/no-multi-comp -- inline route component composing the module-level Harness
      Component: (): React.ReactElement => (
        <Harness
          enabled={enabled}
          onRender={(result) => {
            latest.current = result;
          }}
        />
      ),
      loader: pageLoader,
      path: '/',
    },
    {
      action,
      path: AGENT_CONVERSATIONS_ACTION,
    },
  ]);

  const view = render(<Stub initialEntries={['/']} />);
  return { getByTestId: view.getByTestId, latest };
}

describe('useConversationList', () => {
  describe('when disabled (logged out)', () => {
    test('issues no request to the protected list action', async () => {
      let calls = 0;
      const { latest } = renderConversationList(
        () => {
          calls += 1;
          return { conversations: conversationsPage(0, 1), totalCount: 1 };
        },
        undefined,
        false,
      );

      await waitFor(() => {
        expect(latest.current).not.toBeNull();
      });
      // Mount effects have run by now: a list submit would already have moved
      // the fetcher out of `idle`, which reads as `isLoading` on an empty list.
      expect(latest.current?.isLoading).toBe(false);
      expect(calls).toBe(0);
      expect(latest.current?.conversations).toEqual([]);
    });
  });

  test('loads the first page once on mount', async () => {
    const { latest } = renderConversationList(async ({ request }) => {
      const body = await request.formData();
      expect(body.get('intent')).toBe('list');
      expect(body.get('offset')).toBe('0');
      return { conversations: conversationsPage(0, 2), totalCount: 5 };
    });

    await waitFor(() => {
      expect(latest.current?.conversations).toHaveLength(2);
    });
    expect(latest.current?.totalCount).toBe(5);
    expect(latest.current?.isLoading).toBe(false);
  });

  test('loadMore appends and dedupes by id', async () => {
    let call = 0;
    const { getByTestId, latest } = renderConversationList(async () => {
      call += 1;
      if (call === 1) {
        return { conversations: conversationsPage(0, 2), totalCount: 4 };
      }
      // Overlapping page: conv-1 already present, conv-2/conv-3 are new.
      return { conversations: conversationsPage(1, 3), totalCount: 4 };
    });

    await waitFor(() => {
      expect(latest.current?.conversations).toHaveLength(2);
    });

    const user = userEvent.setup();
    await user.click(getByTestId('load-more'));

    await waitFor(() => {
      expect(latest.current?.conversations).toHaveLength(4);
    });
    expect(latest.current?.conversations.map((c) => c.id)).toEqual([
      'conv-0',
      'conv-1',
      'conv-2',
      'conv-3',
    ]);
  });

  test('refresh clears the list and refetches from the first page', async () => {
    let call = 0;
    const { getByTestId, latest } = renderConversationList(async () => {
      call += 1;
      if (call === 1) {
        return { conversations: conversationsPage(0, 2), totalCount: 2 };
      }
      return { conversations: conversationsPage(0, 1), totalCount: 1 };
    });

    await waitFor(() => {
      expect(latest.current?.conversations).toHaveLength(2);
    });

    const user = userEvent.setup();
    await user.click(getByTestId('refresh'));

    await waitFor(() => {
      expect(latest.current?.conversations).toHaveLength(1);
    });
    expect(latest.current?.totalCount).toBe(1);
  });

  test('rename optimistically updates the local title before the mutation resolves', async () => {
    const { getByTestId, latest } = renderConversationList(
      async ({ request }) => {
        const body = await request.formData();
        const intent = body.get('intent');
        if (intent === 'list') {
          return { conversations: conversationsPage(0, 1), totalCount: 1 };
        }
        return { ok: true };
      },
    );

    await waitFor(() => {
      expect(latest.current?.conversations).toHaveLength(1);
    });

    const user = userEvent.setup();
    await user.click(getByTestId('rename'));

    await waitFor(() => {
      expect(latest.current?.conversations[0]?.title).toBe('Renamed');
    });
  });

  test('remove optimistically drops the conversation and decrements totalCount', async () => {
    const { getByTestId, latest } = renderConversationList(
      async ({ request }) => {
        const body = await request.formData();
        const intent = body.get('intent');
        if (intent === 'list') {
          return { conversations: conversationsPage(0, 1), totalCount: 1 };
        }
        return { ok: true };
      },
    );

    await waitFor(() => {
      expect(latest.current?.conversations).toHaveLength(1);
    });

    const user = userEvent.setup();
    await user.click(getByTestId('remove'));

    await waitFor(() => {
      expect(latest.current?.conversations).toHaveLength(0);
    });
    expect(latest.current?.totalCount).toBe(0);
  });

  describe('restore', () => {
    const listAction = (
      page: {
        id: string;
        title: string;
        updatedAt?: string;
        status?: string;
      }[],
      onRestore?: () => unknown,
    ) => {
      return async ({ request }: { request: Request }): Promise<unknown> => {
        const body = await request.formData();
        if (body.get('intent') === 'list') {
          return { conversations: page, totalCount: page.length };
        }
        return onRestore?.() ?? { conversation: null, errorMessage: null };
      };
    };

    test('re-inserts the row in its updatedAt slot and increments totalCount', async () => {
      const page = [
        {
          groupId: null,
          id: 'a',
          pinned: false,
          status: 'active',
          title: 'A',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
        {
          groupId: null,
          id: 'b',
          pinned: false,
          status: 'active',
          title: 'B',
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
      ];
      const { getByTestId, latest } = renderConversationList(listAction(page));

      await waitFor(() => {
        expect(latest.current?.conversations).toHaveLength(2);
      });

      const user = userEvent.setup();
      await user.click(getByTestId('restore'));

      await waitFor(() => {
        expect(
          latest.current?.conversations.map((conversation) => conversation.id),
        ).toEqual(['a', 'conv-restored', 'b']);
      });
      expect(latest.current?.totalCount).toBe(3);
    });

    test('re-inserts a deleted row when called through the restore captured before the delete', async () => {
      const row = {
        groupId: null,
        id: 'a',
        pinned: false,
        status: 'active',
        title: 'A',
        updatedAt: '2026-08-01T00:00:00.000Z',
      };
      const page = [
        row,
        {
          groupId: null,
          id: 'b',
          pinned: false,
          status: 'active',
          title: 'B',
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
      ];
      const { latest } = renderConversationList(listAction(page));

      await waitFor(() => {
        expect(latest.current?.conversations).toHaveLength(2);
      });

      // An Undo toast holds the `restore` from the render that deleted the row.
      const capturedRestore = latest.current?.restore;
      act(() => {
        latest.current?.remove('a');
      });
      await waitFor(() => {
        expect(latest.current?.conversations).toHaveLength(1);
      });

      act(() => {
        capturedRestore?.(row);
      });

      await waitFor(() => {
        expect(
          latest.current?.conversations.map((conversation) => conversation.id),
        ).toEqual(['a', 'b']);
      });
      expect(latest.current?.totalCount).toBe(2);
    });

    test('orders by time, not string, when updatedAt is Date#toString output', async () => {
      // As the list action serializes it. Lexically 'Sun…' < 'Tue…' would put
      // the restored row first; by time it belongs between the two.
      const page = [
        {
          groupId: null,
          id: 'a',
          pinned: false,
          status: 'active',
          title: 'A',
          updatedAt: `Sun Aug 02 2026 00:00:00 GMT+0000 (Coordinated Universal Time)`,
        },
        {
          groupId: null,
          id: 'b',
          pinned: false,
          status: 'active',
          title: 'B',
          updatedAt: `Mon Jun 01 2026 00:00:00 GMT+0000 (Coordinated Universal Time)`,
        },
      ];
      const { latest } = renderConversationList(listAction(page));

      await waitFor(() => {
        expect(latest.current?.conversations).toHaveLength(2);
      });

      act(() => {
        latest.current?.restore({
          groupId: null,
          id: 'r',
          pinned: false,
          status: 'active',
          title: 'R',
          updatedAt: `Tue Jul 07 2026 00:00:00 GMT+0000 (Coordinated Universal Time)`,
        });
      });

      await waitFor(() => {
        expect(
          latest.current?.conversations.map((conversation) => conversation.id),
        ).toEqual(['a', 'r', 'b']);
      });
    });

    test('does not double-count a row that is already listed', async () => {
      const page = [
        {
          groupId: null,
          id: 'a',
          pinned: false,
          status: 'active',
          title: 'A',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ];
      const { getByTestId, latest } = renderConversationList(listAction(page));

      await waitFor(() => {
        expect(latest.current?.conversations).toHaveLength(1);
      });

      const user = userEvent.setup();
      await user.click(getByTestId('restore-listed'));

      await waitFor(() => {
        expect(latest.current?.conversations).toHaveLength(1);
      });
      expect(latest.current?.totalCount).toBe(1);
    });

    test('posts the restore intent', async () => {
      let intent: FormDataEntryValue | null = null;
      const { getByTestId, latest } = renderConversationList(
        async ({ request }) => {
          const body = await request.formData();
          if (body.get('intent') === 'list') {
            return { conversations: [], totalCount: 0 };
          }
          intent = body.get('intent');
          return { conversation: null, errorMessage: null };
        },
      );

      await waitFor(() => {
        expect(latest.current).not.toBeNull();
      });

      const user = userEvent.setup();
      await user.click(getByTestId('restore'));

      await waitFor(() => {
        expect(intent).toBe('restore');
      });
    });

    test('a failed restore rolls the row back and shows an error toast', async () => {
      const toaster = render(<Toaster />);
      const { getByTestId, latest } = renderConversationList(
        listAction([], () => ({
          conversation: null,
          errorMessage: 'Agent conversation not found',
        })),
      );

      await waitFor(() => {
        expect(latest.current).not.toBeNull();
      });

      const user = userEvent.setup();
      await user.click(getByTestId('restore'));

      expect(
        await toaster.findByText(CHAT_CONVERSATION_SIDEBAR_COPY.restoreFailed),
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(latest.current?.conversations).toHaveLength(0);
      });
      expect(latest.current?.totalCount).toBe(0);
    });
  });

  test('a list read does not re-run the page loader, a rename does', async () => {
    let pageLoads = 0;
    const pageLoader = (): null => {
      pageLoads += 1;
      return null;
    };
    const { getByTestId, latest } = renderConversationList(
      async ({ request }) => {
        const body = await request.formData();
        if (body.get('intent') === 'rename') {
          return { ok: true };
        }
        return { conversations: conversationsPage(0, 2), totalCount: 2 };
      },
      pageLoader,
    );

    await waitFor(() => {
      expect(latest.current?.conversations).toHaveLength(2);
    });
    expect(pageLoads).toBe(1);

    await userEvent.click(getByTestId('rename'));

    await waitFor(() => {
      expect(pageLoads).toBe(2);
    });
  });

  test('surfaces a failed list instead of reading it as an empty one', async () => {
    let call = 0;
    const { getByTestId, latest } = renderConversationList(() => {
      call += 1;
      if (call === 1) {
        return {
          conversations: [],
          errorMessage: 'Missing permission: settings:read',
          totalCount: 0,
        };
      }
      return {
        conversations: conversationsPage(0, 1),
        errorMessage: null,
        totalCount: 1,
      };
    });

    await waitFor(() => {
      expect(latest.current?.errorMessage).toBe(
        'Missing permission: settings:read',
      );
    });
    expect(latest.current?.conversations).toHaveLength(0);

    await userEvent.setup().click(getByTestId('refresh'));

    await waitFor(() => {
      expect(latest.current?.conversations).toHaveLength(1);
    });
    expect(latest.current?.errorMessage).toBeNull();
  });
});
