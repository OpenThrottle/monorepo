import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { WORKSPACE_FULL_JUMP_LINKS } from '~/routing/navigation/data/workspace-jump-links';
import { DashboardQuickNavigation } from '../DashboardQuickNavigation';
import type { DashboardQuickNavigationProps } from '../DashboardQuickNavigation';

function renderWithProps(props: DashboardQuickNavigationProps): RenderResult {
  const Component = () => <DashboardQuickNavigation {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('DashboardQuickNavigation Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderWithProps({});
  });

  test('renders jump section and a link per workspace jump target', () => {
    expect(
      component.getByTestId('DashboardQuickNavigation'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('heading', { level: 3, name: 'Jump to' }),
    ).toBeInTheDocument();
    const links = component.getAllByRole('link');
    expect(links).toHaveLength(WORKSPACE_FULL_JUMP_LINKS.length);
    const searchLink = links.find((el) => el.textContent === 'Search');
    expect(searchLink).toBeDefined();
    expect(searchLink?.getAttribute('href')).toBe('/search');
  });
});
