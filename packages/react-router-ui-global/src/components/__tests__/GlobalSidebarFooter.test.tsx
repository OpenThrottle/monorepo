import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalProviders } from '../GlobalProviders';
import { GlobalSidebarFooter } from '../GlobalSidebarFooter';

describe('GlobalSidebarFooter Component', () => {
  test('renders system status link', () => {
    const Component = () => (
      <GlobalProviders>
        <GlobalSidebarFooter />
      </GlobalProviders>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(
      screen.getByRole('link', { name: /System Status/i }),
    ).toHaveAttribute('href', expect.stringContaining('/health'));
  });
});
