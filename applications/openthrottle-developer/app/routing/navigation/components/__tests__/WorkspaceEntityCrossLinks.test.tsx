import * as React from 'react';
import { cleanup } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { WorkspaceEntityCrossLinks } from '../WorkspaceEntityCrossLinks';
import {
  WORKSPACE_CORE_ENTITY_LINKS,
  WORKSPACE_FULL_JUMP_LINKS,
} from '~/routing/navigation/data/workspace-jump-links';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('WorkspaceEntityCrossLinks', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderRoutesStub(<WorkspaceEntityCrossLinks />);
  });

  test('should render a link for each core entity', () => {
    const root = component.getByTestId('WorkspaceEntityCrossLinks');
    expect(root).toBeInTheDocument();

    for (const item of WORKSPACE_CORE_ENTITY_LINKS) {
      const link = component.getByRole('link', { name: item.label });
      expect(link).toHaveAttribute('href', item.to);
    }
  });

  test('should apply custom aria-label when label prop is set', () => {
    cleanup();
    const { getByRole } = renderRoutesStub(
      <WorkspaceEntityCrossLinks label="Custom region label" />,
    );

    expect(
      getByRole('region', { name: 'Custom region label' }),
    ).toBeInTheDocument();
  });

  test('should render full jump list when variant is full', () => {
    cleanup();
    const { getByRole } = renderRoutesStub(
      <WorkspaceEntityCrossLinks variant="full" />,
    );

    for (const item of WORKSPACE_FULL_JUMP_LINKS) {
      const link = getByRole('link', { name: item.label });
      expect(link).toHaveAttribute('href', item.to);
    }
  });
});
