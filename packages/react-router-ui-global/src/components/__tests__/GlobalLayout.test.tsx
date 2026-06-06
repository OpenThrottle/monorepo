import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalLayout } from '../GlobalLayout';
import { GlobalProviders } from '../GlobalProviders';

describe('GlobalLayout Component', () => {
  test('renders sidebar chrome and main content', () => {
    const Component = () => (
      <GlobalProviders>
        <GlobalLayout>
          <span>layout-child</span>
        </GlobalLayout>
      </GlobalProviders>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('GlobalSidebarHeader')).toBeInTheDocument();
    expect(screen.getByText('layout-child')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /System Status/i }),
    ).toHaveAttribute('href', expect.stringContaining('/health'));
  });
});
