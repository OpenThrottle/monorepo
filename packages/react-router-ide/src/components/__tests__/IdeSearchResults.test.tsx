import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { IdeSearchResults } from '../IdeSearchResults';
import type { IdeRepositoryRef, IdeSearchResult } from '../../data/view-models';

const repository: IdeRepositoryRef = {
  displayName: 'Repo One',
  repositoryId: 'r1',
};

const matchResult: IdeSearchResult = {
  matches: [
    {
      column: 1,
      line: 3,
      lineText: 'export const foo = 1;',
      matchText: 'export',
      path: 'src/a.ts',
    },
    {
      column: 1,
      line: 9,
      lineText: 'export const bar = 2;',
      matchText: 'export',
      path: 'src/b.ts',
    },
  ],
  query: 'export',
  repository,
  truncated: false,
};

describe('IdeSearchResults Component', () => {
  let component: RenderResult;

  test('renders a loading skeleton state', () => {
    component = render(
      <IdeSearchResults
        loading={true}
        result={{ matches: [], query: '', repository, truncated: false }}
      />,
    );

    expect(component.getByTestId('IdeSearchResults')).toBeInTheDocument();
    expect(
      component.queryByTestId('IdeSearchResultRow'),
    ).not.toBeInTheDocument();
  });

  test('renders an empty prompt with no query', () => {
    component = render(
      <IdeSearchResults
        result={{ matches: [], query: '', repository, truncated: false }}
      />,
    );

    expect(component.getByText('Search the workspace')).toBeInTheDocument();
  });

  test('renders a no-matches state when a query returns nothing', () => {
    component = render(
      <IdeSearchResults
        result={{ matches: [], query: 'nope', repository, truncated: false }}
      />,
    );

    expect(component.getByText('No matches')).toBeInTheDocument();
  });

  test('renders a row per match and fires onSelectMatch', async () => {
    const user = userEvent.setup();
    const onSelectMatch = vi.fn();
    component = render(
      <IdeSearchResults onSelectMatch={onSelectMatch} result={matchResult} />,
    );

    const [firstRow] = component.getAllByTestId('IdeSearchResultRow');
    expect(component.getAllByTestId('IdeSearchResultRow')).toHaveLength(2);
    if (firstRow === undefined) throw new Error('expected a result row');

    await user.click(firstRow);
    expect(onSelectMatch).toHaveBeenCalledWith(matchResult.matches[0]);
  });

  test('shows a truncation note when results were capped', () => {
    component = render(
      <IdeSearchResults result={{ ...matchResult, truncated: true }} />,
    );

    expect(component.getByText(/Results truncated/)).toBeInTheDocument();
  });
});
