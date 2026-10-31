import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { OpenThrottleBreadcrumbsProps } from '../OpenThrottleBreadcrumbs';
import { OpenThrottleBreadcrumbs } from '../OpenThrottleBreadcrumbs';

describe('OpenThrottleBreadcrumbs Component', () => {
  let props: OpenThrottleBreadcrumbsProps;

  const Component = () => <OpenThrottleBreadcrumbs {...props} />;

  const renderBreadcrumbs = (): RenderResult => {
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = { children: null, links: [] };
  });

  test('renders breadcrumb navigation', () => {
    const component = renderBreadcrumbs();

    expect(
      component.getByTestId('OpenThrottleBreadcrumbs'),
    ).toBeInTheDocument();
    expect(component.getByRole('navigation')).toBeInTheDocument();
  });

  test('hides every link but the nearest parent below sm', () => {
    props = {
      children: 'Task title',
      links: [
        { children: 'Plans', to: '/plans' },
        { children: 'Plan title', to: '/plans/1' },
      ],
    };
    const component = renderBreadcrumbs();

    const root = component.getByRole('link', { name: 'Plans' });
    const parent = component.getByRole('link', { name: 'Plan title' });

    expect(root.closest('li')).toHaveClass('max-sm:hidden');
    expect(parent.closest('li')).not.toHaveClass('max-sm:hidden');
    expect(component.getByText('Task title')).toBeInTheDocument();
  });
});
