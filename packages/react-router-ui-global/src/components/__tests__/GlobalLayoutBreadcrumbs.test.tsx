import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalLayoutBreadcrumbs } from '../GlobalLayoutBreadcrumbs';

describe('GlobalLayoutBreadcrumbs Component', () => {
  test('renders breadcrumb navigation', () => {
    const Component = () => <GlobalLayoutBreadcrumbs />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('OpenThrottleBreadcrumbs')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
