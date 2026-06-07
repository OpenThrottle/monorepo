import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalSidebarHeader } from '../GlobalSidebarHeader';

describe('GlobalSidebarHeader Component', () => {
  test('renders logo link to home', () => {
    const Component = () => <GlobalSidebarHeader name="" />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('GlobalSidebarHeader')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/');
    expect(screen.getByText('OpenThrottle')).toBeInTheDocument();
  });
});
