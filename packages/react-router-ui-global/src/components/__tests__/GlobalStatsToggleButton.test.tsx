import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useSearchParams } from 'react-router';
import { describe, expect, test } from 'vitest';

import { GLOBAL_STATS_TOGGLE_COPY } from '../../data/data.copy';
import { ROUTE_STATS_URL } from '../../data/data.route-stats';
import { GlobalStatsToggleButton } from '../GlobalStatsToggleButton';

function Harness(): React.ReactElement {
  const [searchParams] = useSearchParams();

  return (
    <>
      <GlobalStatsToggleButton />
      <span data-testid="qs">{searchParams.toString()}</span>
    </>
  );
}

const renderAt = (entry: string): ReturnType<typeof render> => {
  const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);

  return render(<RoutesStub initialEntries={[entry]} />);
};

describe('GlobalStatsToggleButton', () => {
  test('points aria-controls at the stats panel', () => {
    const component = renderAt('/');

    expect(component.getByRole('button')).toHaveAttribute(
      'aria-controls',
      ROUTE_STATS_URL.contentId,
    );
  });

  describe('when closed', () => {
    test('is collapsed and labelled to show the stats', () => {
      const component = renderAt('/');

      const button = component.getByRole('button', {
        name: GLOBAL_STATS_TOGGLE_COPY.show,
      });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('when ?stats=open', () => {
    test('is expanded and labelled to hide the stats', () => {
      const component = renderAt('/?stats=open');

      const button = component.getByRole('button', {
        name: GLOBAL_STATS_TOGGLE_COPY.hide,
      });
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  test('clicking flips aria-expanded and the URL, keeping other params', async () => {
    const user = userEvent.setup();
    const component = renderAt('/?status=QUEUED');

    await user.click(component.getByRole('button'));

    expect(component.getByRole('button')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    const qs = new URLSearchParams(
      component.getByTestId('qs').textContent ?? '',
    );
    expect(qs.get('stats')).toBe('open');
    expect(qs.get('status')).toBe('QUEUED');
  });
});
