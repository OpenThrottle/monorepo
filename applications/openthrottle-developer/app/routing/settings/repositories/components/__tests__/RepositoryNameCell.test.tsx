import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  mockCheckout,
  mockRepository,
} from '~/routing/settings/repositories/data/mock.repositories';
import { REPOSITORIES_TABLE_COPY } from '~/routing/settings/repositories/data/data.copy';
import { buildRepositoryRows } from '~/routing/settings/repositories/utils/rows';
import { RepositoryNameCell } from '../RepositoryNameCell';
import type { RepositoryNameCellProps } from '../RepositoryNameCell';

const [parentRow] = buildRepositoryRows([
  mockRepository({
    checkouts: [
      mockCheckout({ displayName: 'openthrottle', id: 'primary-1' }),
      mockCheckout({
        displayName: 'openthrottle-worktree',
        id: 'worktree-1',
        kind: 'worktree',
      }),
    ],
    id: 'repo-1',
    name: 'monorepo',
  }),
]);
const [childRow] = parentRow.children ?? [];

describe('RepositoryNameCell Component', () => {
  let component: RenderResult;
  let props: RepositoryNameCellProps;

  const setup = (): void => {
    const Component = () => <RepositoryNameCell {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      canExpand: true,
      depth: 0,
      isExpanded: false,
      onToggleExpanded: vi.fn(),
      row: parentRow,
    };
  });

  test('links a depth-0 row to its repository detail route', () => {
    setup();

    expect(component.getByRole('link', { name: 'monorepo' })).toHaveAttribute(
      'href',
      '/settings/repositories/repo-1',
    );
    expect(component.getByText('openthrottle')).toBeInTheDocument();
  });

  test('omits the repository link on a nested child row', () => {
    props = { ...props, canExpand: false, depth: 1, row: childRow };
    setup();

    expect(component.queryByRole('link')).toBeNull();
    expect(component.getByText('openthrottle-worktree')).toBeInTheDocument();
  });

  test('badges a worktree row and leaves a primary row unbadged', () => {
    setup();

    expect(
      component.queryByText(REPOSITORIES_TABLE_COPY.worktreeBadge),
    ).toBeNull();

    component.unmount();
    props = { ...props, canExpand: false, depth: 1, row: childRow };
    setup();

    expect(
      component.getByText(REPOSITORIES_TABLE_COPY.worktreeBadge),
    ).toBeInTheDocument();
  });

  test('calls onToggleExpanded from the chevron and labels it by state', async () => {
    const user = userEvent.setup();
    setup();

    const toggle = component.getByRole('button', {
      name: REPOSITORIES_TABLE_COPY.expandGroup,
    });
    await user.click(toggle);

    expect(props.onToggleExpanded).toHaveBeenCalledTimes(1);
  });

  test('labels the chevron for collapsing once expanded', () => {
    props = { ...props, isExpanded: true };
    setup();

    expect(
      component.getByRole('button', {
        name: REPOSITORIES_TABLE_COPY.collapseGroup,
      }),
    ).toBeInTheDocument();
  });

  test('renders no toggle when the row has nothing to expand', () => {
    props = { ...props, canExpand: false };
    setup();

    expect(component.queryByRole('button')).toBeNull();
  });
});
