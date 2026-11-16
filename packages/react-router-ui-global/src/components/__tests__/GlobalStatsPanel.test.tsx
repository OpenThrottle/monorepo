import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { ROUTE_STATS_URL } from '../../data/data.route-stats';
import { GlobalStatsPanel } from '../GlobalStatsPanel';
import { GlobalStatsToggleButton } from '../GlobalStatsToggleButton';

function Harness(): React.ReactElement {
  return (
    <>
      <GlobalStatsToggleButton />
      <GlobalStatsPanel>
        <a href="/inside">Inside link</a>
      </GlobalStatsPanel>
    </>
  );
}

const renderAt = (entry: string): ReturnType<typeof render> => {
  const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);

  return render(<RoutesStub initialEntries={[entry]} />);
};

describe('GlobalStatsPanel', () => {
  describe('when closed', () => {
    test('hides the panel and renders none of its content', () => {
      const component = renderAt('/');

      const panel = component.getByTestId('GlobalStatsPanel');
      expect(panel).toHaveAttribute('hidden');
      expect(panel).toHaveAttribute('data-state', 'closed');
      expect(panel).toBeEmptyDOMElement();
      expect(component.queryByRole('link', { name: 'Inside link' })).toBeNull();
    });
  });

  describe('when ?stats=open', () => {
    test('renders the content under the shared panel id', () => {
      const component = renderAt('/?stats=open');

      const panel = component.getByTestId('GlobalStatsPanel');
      expect(panel).toHaveAttribute('id', ROUTE_STATS_URL.contentId);
      expect(panel).toHaveAttribute('data-state', 'open');
      expect(
        component.getByRole('link', { name: 'Inside link' }),
      ).toBeInTheDocument();
    });

    test('gates the height animation behind motion-safe', () => {
      const component = renderAt('/?stats=open');

      const panel = component.getByTestId('GlobalStatsPanel');
      expect(panel.className).toContain(
        'motion-safe:data-[state=open]:animate-collapsible-down',
      );
      expect(panel.className).toContain(
        'motion-safe:data-[state=closed]:animate-collapsible-up',
      );
      expect(panel.className).not.toMatch(/(^|\s)data-\[state=open\]:animate/);
    });
  });

  test('the toolbar button opens and closes the panel', async () => {
    const user = userEvent.setup();
    const component = renderAt('/');

    await user.click(component.getByTestId('GlobalStatsToggleButton'));

    expect(
      component.getByRole('link', { name: 'Inside link' }),
    ).toBeInTheDocument();

    await user.click(component.getByTestId('GlobalStatsToggleButton'));

    await waitFor(() => {
      expect(component.getByTestId('GlobalStatsPanel')).toHaveAttribute(
        'hidden',
      );
    });
    expect(component.queryByRole('link', { name: 'Inside link' })).toBeNull();
  });
});
