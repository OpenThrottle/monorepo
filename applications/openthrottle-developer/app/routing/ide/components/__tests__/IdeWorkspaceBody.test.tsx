import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { IdeWorkspaceBody } from '../IdeWorkspaceBody';
import type { IdeWorkspaceBodyProps } from '../IdeWorkspaceBody';
import type { UseIdeWorkspaceResult } from '~/routing/ide/hooks/useIdeWorkspace';

const baseWorkspace: UseIdeWorkspaceResult = {
  details: undefined,
  detailsLoading: false,
  exportsData: undefined,
  exportsLoading: false,
  handleIndex: vi.fn(),
  handleSearch: vi.fn(),
  handleSelectRepository: vi.fn(),
  handleSelectSymbol: vi.fn(),
  handleSemanticSearch: vi.fn(),
  handleTabChange: vi.fn(),
  indexBusy: false,
  selectedSymbol: undefined,
  semanticData: undefined,
  semanticLoading: false,
  semanticQuery: '',
};

const renderBody = (props: IdeWorkspaceBodyProps): RenderResult => {
  const Component = () => <IdeWorkspaceBody {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('IdeWorkspaceBody Component', () => {
  let props: IdeWorkspaceBodyProps;

  beforeEach(() => {
    props = {
      listing: null,
      query: '',
      repositories: [{ id: 'repo-1', label: 'monorepo' }],
      search: null,
      selectedId: null,
      workspace: baseWorkspace,
    };
  });

  test('renders the empty state when no repository is selected', () => {
    const component = renderBody(props);

    expect(component.getByTestId('IdeNoRepository')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'Add a repository' }),
    ).toHaveAttribute('href', '/settings/repositories');
  });

  test('renders the tabbed workspace when a repository and listing are present', () => {
    props = {
      ...props,
      listing: {
        paths: ['README.md'],
        repository: {
          displayName: 'monorepo',
          repositoryId: 'repo-1',
        },
        truncated: false,
      },
      selectedId: 'repo-1',
    };

    const component = renderBody(props);

    expect(component.queryByTestId('IdeNoRepository')).not.toBeInTheDocument();
    expect(
      component.getByRole('tab', { name: 'Files & Search' }),
    ).toBeInTheDocument();
    expect(component.getByRole('tab', { name: 'Symbols' })).toBeInTheDocument();
    expect(
      component.getByRole('tab', { name: 'Semantic' }),
    ).toBeInTheDocument();
  });
});
