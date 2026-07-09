import * as React from 'react';
import { describe, expect, test } from 'vitest';
import { buildRootMatch } from '~/testing/root-match-fixture';
import Index from '../prompts._index';
import type { PromptCardFragment } from '~/__generated__/graphql';
import { CustomPromptType } from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';
import type { Route } from '@/app/routes/+types/prompts._index';

type PromptsIndexLoaderData = Route.ComponentProps['loaderData'];

const mockPrompt: PromptCardFragment = {
  __typename: 'CustomPromptObject',
  content: '# Test',
  createdAt: '2024-01-15T10:00:00Z',
  description: 'Route test prompt',
  filePath: '/path/to/prompt.md',
  id: 'prompt-route-1',
  labels: ['route'],
  promptType: CustomPromptType.Agents,
  title: 'Route Test Prompt',
  updatedAt: '2024-01-20T15:30:00Z',
};

const mockLoaderDataWithPrompts: PromptsIndexLoaderData = {
  countAgents: 1,
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
  countAgents: 0,
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

  test('renders empty state inside table path when no prompts', () => {
    const view = renderRoutesStub(
      <Index
        actionData={undefined}
        loaderData={mockLoaderDataEmpty}
        matches={matches}
        params={{}}
      />,
    );

    expect(view.getByText('No prompts yet')).toBeInTheDocument();
    expect(view.getByTestId('PromptsTable')).toBeInTheDocument();
    expect(view.queryByTestId('PromptCard')).not.toBeInTheDocument();
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
});
