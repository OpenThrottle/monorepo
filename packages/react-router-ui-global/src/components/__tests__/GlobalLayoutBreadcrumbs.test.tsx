import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { GlobalLayoutBreadcrumbs } from '../GlobalLayoutBreadcrumbs';

describe('GlobalLayoutBreadcrumbs Component', () => {
  test('renders breadcrumb navigation', () => {
    const Component = () => {
      return <GlobalLayoutBreadcrumbs />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByTestId('OpenThrottleBreadcrumbs'),
    ).toBeInTheDocument();
    expect(component.getByRole('navigation')).toBeInTheDocument();
  });
});
