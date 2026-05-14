import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalLayout } from '../GlobalLayout';
import { GlobalProviders } from '../GlobalProviders';
import { GlobalScreen } from '../GlobalScreen';

/**
 * @description Integration smoke: provider stack + layout + screen mount together without regressions in context wiring (SidebarProvider, DnD, tooltips).
 */
describe('Global shell composition', () => {
  test('mounts GlobalProviders wrapping GlobalLayout and GlobalScreen with minimal children', () => {
    const ShellRoute = (): React.ReactElement => (
      <GlobalProviders>
        <GlobalLayout>
          <GlobalScreen>
            <p>Shell smoke content</p>
          </GlobalScreen>
        </GlobalLayout>
      </GlobalProviders>
    );

    const RoutesStub = createRoutesStub([{ Component: ShellRoute, path: '/' }]);

    render(<RoutesStub />);

    expect(screen.getByText('Shell smoke content')).toBeInTheDocument();
    /** SidebarInset and GlobalScreen both render `main`; assert at least one landmark exists. */
    expect(screen.getAllByRole('main').length).toBeGreaterThanOrEqual(1);
  });
});
