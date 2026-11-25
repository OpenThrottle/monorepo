import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/prompts._index';
import type { PromptCardFragment } from '~/__generated__/graphql';
import { CustomPromptType } from '~/__generated__/graphql';
import {
  PROMPTS_EMPTY_COPY,
  PROMPTS_ONBOARDING,
  PROMPTS_STATS_COPY,
} from '~/routing/prompts/data/copy';
import { buildRootMatch } from '~/testing/buildRootMatch';
import {
  renderRoutesStub,
  renderWithMemoryRouter,
} from '~/testing/route-fixtures';

import Index from '../prompts._index';

type PromptsIndexLoaderData = Route.ComponentProps['loaderData'];

const mockPrompt: PromptCardFragment = {
  __typename: 'CustomPromptObject',
  content: '# Test',
  createdAt: '2024-01-15T10:00:00Z',
  description: 'Route test prompt',
  filePath: '/path/to/prompt.md',
  id: 'prompt-route-1',
  labels: ['route'],
  promptType: CustomPromptType.Prompts,
  title: 'Route Test Prompt',
  updatedAt: '2024-01-20T15:30:00Z',
};

const mockLoaderDataWithPrompts: PromptsIndexLoaderData = {
  countPersonas: 0,
  countPrompts: 1,
  countSkills: 0,
  limit: 20,
  page: 1,
  prompts: [mockPrompt],
  search: null,
  total: 1,
  totalPages: 1,
  types: [],
};

const mockLoaderDataEmpty: PromptsIndexLoaderData = {
  countPersonas: 0,
  countPrompts: 0,
  countSkills: 0,
  limit: 20,
  page: 1,
  prompts: [],
  search: null,
  total: 0,
  totalPages: 0,
  types: [],
};

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/prompts._index',
    loaderData: mockLoaderDataEmpty,
    params: {},
    pathname: '/',
  },
];

describe('routes/prompts._index.tsx', () => {
  test('renders PromptsTable with prompt rows and no card grid', () => {
    const view = renderRoutesStub(
      <Index
        actionData={undefined}
        loaderData={mockLoaderDataWithPrompts}
        matches={matches}
        params={{}}
      />,
    );

    expect(view.getByTestId('PromptsTable')).toBeInTheDocument();
    expect(view.getByText('Route Test Prompt')).toBeInTheDocument();
    expect(view.queryByTestId('PromptCard')).not.toBeInTheDocument();
    expect(view.queryByTestId('prompts-grid')).not.toBeInTheDocument();
  });

  test('shows the onboarding pitch for a new user (empty + unfiltered)', () => {
    const view = renderRoutesStub(
      <Index
        actionData={undefined}
        loaderData={mockLoaderDataEmpty}
        matches={matches}
        params={{}}
      />,
    );

    expect(view.getByTestId('GlobalFeatureOnboarding')).toBeInTheDocument();
    expect(view.getByTestId('PromptsIntroduction')).toBeInTheDocument();
    expect(view.queryByTestId('PromptsTable')).not.toBeInTheDocument();
    expect(
      view.getByRole('link', { name: PROMPTS_ONBOARDING.cta.label }),
    ).toHaveAttribute('href', PROMPTS_ONBOARDING.cta.to);
  });

  test('renders empty state inside table path when filters match nothing', () => {
    const view = renderRoutesStub(
      <Index
        actionData={undefined}
        loaderData={{
          ...mockLoaderDataEmpty,
          search: 'zzzz-no-match',
        }}
        matches={matches}
        params={{}}
      />,
    );

    expect(view.getByText(PROMPTS_EMPTY_COPY.searchTitle)).toBeInTheDocument();
    expect(view.getByTestId('PromptsTable')).toBeInTheDocument();
    expect(
      view.queryByTestId('GlobalFeatureOnboarding'),
    ).not.toBeInTheDocument();
    expect(view.queryByTestId('PromptCard')).not.toBeInTheDocument();
  });

  test('renders the onboarding trigger in the header when populated', () => {
    const view = renderRoutesStub(
      <Index
        actionData={undefined}
        loaderData={mockLoaderDataWithPrompts}
        matches={matches}
        params={{}}
      />,
    );

    expect(
      view.getByTestId('GlobalFeatureOnboardingTrigger'),
    ).toBeInTheDocument();
    expect(
      view.queryByTestId('GlobalFeatureOnboarding'),
    ).not.toBeInTheDocument();
  });

  test('reveals the onboarding modal over a populated list via ?modal=onboarding', () => {
    const view = renderWithMemoryRouter(
      [
        {
          element: (
            <Index
              actionData={undefined}
              loaderData={mockLoaderDataWithPrompts}
              matches={matches}
              params={{}}
            />
          ),
          path: '/prompts',
        },
      ],
      { initialEntries: ['/prompts?modal=onboarding'] },
    );

    expect(view.getByTestId('GlobalFeatureOnboarding')).toBeInTheDocument();
    expect(
      view.getByRole('link', { name: PROMPTS_ONBOARDING.cta.label }),
    ).toHaveAttribute('href', PROMPTS_ONBOARDING.cta.to);
  });

  test('renders pagination when prompts exist', () => {
    const view = renderRoutesStub(
      <Index
        actionData={undefined}
        loaderData={{
          ...mockLoaderDataWithPrompts,
          limit: 10,
          page: 2,
          total: 25,
          totalPages: 3,
        }}
        matches={matches}
        params={{}}
      />,
    );

    expect(view.getByTestId('OpenThrottlePagination')).toBeInTheDocument();
    const pageLink = view.getByRole('link', { name: '2' });
    const href = pageLink.getAttribute('href') ?? '';
    expect(href).toContain('/prompts?');
    expect(href).toContain('page=2');
    expect(href).toContain('limit=10');
  });

  test('keeps the type filter, search and sort in the page links', () => {
    const view = renderWithMemoryRouter(
      [
        {
          element: (
            <Index
              actionData={undefined}
              loaderData={{
                ...mockLoaderDataWithPrompts,
                limit: 10,
                page: 1,
                total: 25,
                totalPages: 3,
              }}
              matches={matches}
              params={{}}
            />
          ),
          path: '/prompts',
        },
      ],
      {
        initialEntries: [
          '/prompts?type=agents&type=commands&q=review&sortBy=name&sortOrder=desc',
        ],
      },
    );

    const href = view.getByRole('link', { name: '2' }).getAttribute('href');
    const params = new URLSearchParams(href?.split('?')[1]);
    expect(href).toMatch(/^\/prompts\?/);
    expect(params.getAll('type')).toEqual(['agents', 'commands']);
    expect(params.get('q')).toBe('review');
    expect(params.get('sortBy')).toBe('name');
    expect(params.get('sortOrder')).toBe('desc');
    expect(params.get('page')).toBe('2');
  });

  describe('collapsible stats', () => {
    test('the stat cards are collapsed by default', () => {
      const view = renderRoutesStub(
        <Index
          actionData={undefined}
          loaderData={mockLoaderDataWithPrompts}
          matches={matches}
          params={{}}
        />,
      );

      expect(view.queryByTestId('PromptsStats')).not.toBeInTheDocument();
      expect(view.getByTestId('GlobalStatsToggleButton')).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });

    test('?stats=open shows the per-type counts', () => {
      const view = renderWithMemoryRouter(
        [
          {
            element: (
              <Index
                actionData={undefined}
                loaderData={mockLoaderDataWithPrompts}
                matches={matches}
                params={{}}
              />
            ),
            path: '/prompts',
          },
        ],
        { initialEntries: ['/prompts?stats=open'] },
      );

      const stats = view.getByTestId('PromptsStats');
      expect(stats).toHaveTextContent(PROMPTS_STATS_COPY.prompts);
      expect(stats).toHaveTextContent(PROMPTS_STATS_COPY.personas);
    });

    test('a new user sees neither the stats nor the toggle', () => {
      const view = renderRoutesStub(
        <Index
          actionData={undefined}
          loaderData={mockLoaderDataEmpty}
          matches={matches}
          params={{}}
        />,
      );

      expect(view.queryByTestId('GlobalStatsPanel')).not.toBeInTheDocument();
      expect(
        view.queryByTestId('GlobalStatsToggleButton'),
      ).not.toBeInTheDocument();
    });
  });
});
