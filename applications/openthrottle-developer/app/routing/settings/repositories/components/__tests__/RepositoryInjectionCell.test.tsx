import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  mockCheckout,
  mockRepository,
} from '~/routing/settings/repositories/data/mock.repositories';
import { REPOSITORIES_TABLE_COPY } from '~/routing/settings/repositories/data/data.copy';
import { buildRepositoryRows } from '~/routing/settings/repositories/utils/rows';
import { RepositoryInjectionCell } from '../RepositoryInjectionCell';
import type { RepositoryInjectionCellProps } from '../RepositoryInjectionCell';

const [parentRow] = buildRepositoryRows([
  mockRepository({
    checkouts: [
      mockCheckout({
        displayName: 'openthrottle',
        foreignSkillInjectionEnabled: true,
        id: 'primary-1',
      }),
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

describe('RepositoryInjectionCell Component', () => {
  let component: RenderResult;
  let props: RepositoryInjectionCellProps;

  const setup = (): void => {
    const Component = () => <RepositoryInjectionCell {...props} />;
    const RoutesStub = createRoutesStub([
      { Component, path: '/' },
      {
        action: async () => null,
        path: '/resources/repository-skill-injection',
      },
    ]);
    component = render(<RoutesStub />);
  };

  beforeEach(() => {
    props = { depth: 0, row: parentRow };
  });

  test('owns the switch on a depth-0 repository row', () => {
    setup();

    expect(
      component.getByTestId('RepositorySkillInjectionToggle-repo-1'),
    ).toBeChecked();
    expect(
      component.queryByText(REPOSITORIES_TABLE_COPY.injectionInherited),
    ).toBeNull();
  });

  test('marks a nested worktree row as inheriting, with no second switch', () => {
    props = { depth: 1, row: childRow };
    setup();

    const marker = component.getByText(
      REPOSITORIES_TABLE_COPY.injectionInherited,
    );
    expect(marker).toBeInTheDocument();
    expect(marker).toHaveAttribute(
      'title',
      REPOSITORIES_TABLE_COPY.injectionInheritedTitle,
    );
    expect(
      component.queryByTestId('RepositorySkillInjectionToggle-repo-1'),
    ).toBeNull();
  });

  test('reads the repository rollup, so a child agrees with its parent', () => {
    props = { depth: 0, row: childRow };
    setup();

    // The child carries the same rollup value as the parent — the flag is
    // repository-level, not per checkout.
    expect(
      component.getByTestId('RepositorySkillInjectionToggle-repo-1'),
    ).toBeChecked();
  });
});
