import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { GlobalLayout } from '../GlobalLayout';
import { GlobalProviders } from '../GlobalProviders';

describe('GlobalLayout Component', () => {
  test('renders sidebar chrome and main content', () => {
    const Component = () => {
      return (
        <GlobalProviders>
          <GlobalLayout>
            <span>layout-child</span>
          </GlobalLayout>
        </GlobalProviders>
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('GlobalSidebarHeader')).toBeInTheDocument();
    expect(component.getByText('layout-child')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /System Status/i }),
    ).toHaveAttribute('href', expect.stringContaining('/health'));
  });
});
