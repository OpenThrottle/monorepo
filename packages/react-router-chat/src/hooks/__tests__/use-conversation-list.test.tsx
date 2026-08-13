import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { AGENT_CONVERSATIONS_ACTION } from '../use-agentic-chat-turn';
import {
  useConversationList,
  type UseConversationListResult,
} from '../use-conversation-list';

function conversationsPage(
  offset: number,
  count: number,
): { id: string; title: string }[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `conv-${offset + index}`,
    title: `Conversation ${offset + index}`,
  }));
}

interface HarnessProps {
  readonly onRender: (result: UseConversationListResult) => void;
}

function Harness({ onRender }: HarnessProps): React.ReactElement {
  const list = useConversationList();

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
    </div>
  );
}

function renderConversationList(
  action: (args: { request: Request }) => Promise<unknown> | unknown,
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
          onRender={(result) => {
            latest.current = result;
          }}
        />
      ),
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
});
