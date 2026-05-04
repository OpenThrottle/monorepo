import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { WorkspaceEntityCrossLinks } from '../WorkspaceEntityCrossLinks';
import { WORKSPACE_CORE_ENTITY_LINKS } from '~/routing/navigation/data/workspace-jump-links';

describe('WorkspaceEntityCrossLinks', () => {
  let component: RenderResult;

  beforeEach(() => {
    const Component = () => <WorkspaceEntityCrossLinks />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
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
    const Component = () => (
      <WorkspaceEntityCrossLinks label="Custom region label" />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByRole } = render(<RoutesStub />);

    expect(
      getByRole('region', { name: 'Custom region label' }),
    ).toBeInTheDocument();
  });
});
