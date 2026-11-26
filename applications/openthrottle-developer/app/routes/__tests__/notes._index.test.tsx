import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { cleanup, render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/notes._index';
import type { NoteCardFragment } from '~/__generated__/graphql';
import { buildRootMatch } from '~/testing/buildRootMatch';

import Index, { loader } from '../notes._index';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

type LoaderData = Route.ComponentProps['loaderData'];

const NOTE: NoteCardFragment = {
  __typename: 'NoteObject',
  author: 'visormatt',
  content: '# First Note\n\nBody',
  createdAt: '2026-11-20T00:00:00.000Z',
  id: 'note-1',
  updatedAt: null,
};

const makeNotes = (count: number): NoteCardFragment[] => {
  return Array.from({ length: count }, (_, index) => {
    return { ...NOTE, content: `Note ${index + 1}`, id: `note-${index + 1}` };
  });
};

const buildLoaderData = (
  notes: NoteCardFragment[],
  pagination: { limit: number; page: number; total: number } = {
    limit: 25,
    page: 1,
    total: notes.length,
  },
): LoaderData => {
  return {
    ...pagination,
    notes,
    search: '',
    stats: {
      authorCount: 1,
      createdLast30Days: notes.length,
      total: notes.length,
      updatedLast7Days: notes.length,
    },
  };
};

const renderIndex = (
  loaderData: LoaderData,
  initialEntry = '/notes',
): ReturnType<typeof render> => {
  const matches: Route.ComponentProps['matches'] = [
    buildRootMatch(),
    {
      handle: undefined,
      id: 'routes/notes._index',
      loaderData,
      params: {},
      pathname: '/notes',
    },
  ];
  // useFetcher + useSearchParams require a data router.
  const Wrapped = (): React.ReactElement => {
    return (
      <TooltipProvider>
        <Index
          actionData={undefined}
          loaderData={loaderData}
          matches={matches}
          params={{}}
        />
      </TooltipProvider>
    );
  };
  const RoutesStub = createRoutesStub([{ Component: Wrapped, path: '/notes' }]);

  return render(<RoutesStub initialEntries={[initialEntry]} />);
};

describe('routes/notes._index.tsx', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders introduction, toolbar with stats toggle, and table', () => {
    const component = renderIndex(buildLoaderData([NOTE]));

    expect(
      component.getByRole('heading', { name: 'Notes' }),
    ).toBeInTheDocument();
    expect(component.getByTestId('NotesToolbar')).toBeInTheDocument();
    expect(
      component.getByTestId('GlobalStatsToggleButton'),
    ).toBeInTheDocument();
    expect(component.getByTestId('NotesTable')).toBeInTheDocument();
  });

  describe('stats panel', () => {
    test('is collapsed by default', () => {
      const component = renderIndex(buildLoaderData([NOTE]));

      expect(component.getByTestId('GlobalStatsPanel')).toHaveAttribute(
        'data-state',
        'closed',
      );
      expect(component.queryByTestId('NotesStats')).not.toBeInTheDocument();
    });

    test('shows NotesStats when ?stats=open', () => {
      const component = renderIndex(
        buildLoaderData([NOTE]),
        '/notes?stats=open',
      );

      expect(component.getByTestId('NotesStats')).toBeInTheDocument();
    });
  });

  test('renders cards instead of the table with ?view=card', () => {
    const component = renderIndex(buildLoaderData([NOTE]), '/notes?view=card');

    expect(component.getByTestId('NoteCard')).toBeInTheDocument();
    expect(component.queryByTestId('NotesTable')).not.toBeInTheDocument();
  });

  describe('pagination', () => {
    test('keeps search and view on the next-page link', () => {
      const component = renderIndex(
        buildLoaderData(makeNotes(25), { limit: 25, page: 1, total: 60 }),
        '/notes?search=note&view=card',
      );
      const next = component.getByRole('link', { name: 'Go to next page' });
      const href = next.getAttribute('href') ?? '';
      const qs = new URLSearchParams(href.split('?')[1]);

      expect(href.startsWith('/notes?')).toBe(true);
      expect(qs.get('page')).toBe('2');
      expect(qs.get('search')).toBe('note');
      expect(qs.get('view')).toBe('card');
    });

    test('shows the empty state for a page past the end', () => {
      const component = renderIndex(
        buildLoaderData([], { limit: 25, page: 9, total: 3 }),
        '/notes?page=9',
      );

      expect(component.getByText('No notes yet')).toBeInTheDocument();
    });
  });
});

describe('routes/notes._index loader', () => {
  const runLoader = async (
    url: string,
    notes: NoteCardFragment[],
  ): Promise<Awaited<ReturnType<typeof loader>>> => {
    mockExecuteGraphqlWithAuth.mockReset();
    mockExecuteGraphqlWithAuth.mockResolvedValue(
      asMock<
        Awaited<ReturnType<typeof graphqlWithAuth.executeGraphqlWithAuth>>
      >({ notes }),
    );
    const request = new Request(url);

    return loader({
      context: createTestRouterContext(),
      params: {},
      pattern: '/notes',
      request,
      url: new URL(url),
    });
  };

  test('returns one page of notes with stats over every matching note', async () => {
    const result = await runLoader(
      'http://localhost/notes?page=2&limit=10',
      makeNotes(25),
    );

    expect(result.notes.map((note) => note.id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `note-${index + 11}`),
    );
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.total).toBe(25);
    expect(result.stats.total).toBe(25);
  });

  test('paginates after the search filter', async () => {
    const result = await runLoader(
      'http://localhost/notes?search=Note%201',
      makeNotes(12),
    );

    // "Note 1", "Note 10", "Note 11", "Note 12"
    expect(result.total).toBe(4);
    expect(result.notes).toHaveLength(4);
  });
});
