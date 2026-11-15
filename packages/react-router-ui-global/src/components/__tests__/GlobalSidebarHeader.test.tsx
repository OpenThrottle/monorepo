import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { GlobalSidebarHeader } from '../GlobalSidebarHeader';

describe('GlobalSidebarHeader Component', () => {
  test('renders logo link to home', () => {
    const Component = () => {
      return <GlobalSidebarHeader name="" />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('GlobalSidebarHeader')).toBeInTheDocument();
    expect(component.getByRole('link')).toHaveAttribute('href', '/');
    expect(component.getByText('Open')).toBeInTheDocument();
    expect(component.getByText('Throttle')).toBeInTheDocument();
  });
});
