import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalServerHealthBanner } from '../GlobalServerHealthBanner';
import type { GlobalServerHealthBannerProps } from '../GlobalServerHealthBanner';

describe('GlobalServerHealthBanner', () => {
  let component: ReturnType<typeof render>;
  let props: GlobalServerHealthBannerProps;

  beforeEach(() => {
    props = {};
  });

  describe('when health is undefined', () => {
    beforeEach(() => {
      const Component = () => <GlobalServerHealthBanner {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('does not render the banner', () => {
      expect(component.queryByTestId('GlobalServerHealthBanner')).toBeNull();
    });
  });

  describe('when database is ok', () => {
    beforeEach(() => {
      props = {
        health: { api: 'ok', database: 'ok', redis: 'ok', websocket: 'ok' },
      };
      const Component = () => <GlobalServerHealthBanner {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('does not render the banner', () => {
      expect(component.queryByTestId('GlobalServerHealthBanner')).toBeNull();
    });
  });

  describe('when database is unreachable', () => {
    beforeEach(() => {
      props = {
        health: {
          api: 'ok',
          database: 'unreachable',
          redis: 'ok',
          websocket: 'ok',
        },
      };
      const Component = () => <GlobalServerHealthBanner {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('renders the banner with message', () => {
      const banner = component.getByTestId('GlobalServerHealthBanner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveAttribute('role', 'alert');
      expect(banner).toHaveTextContent(
        'Cortex (AI MCP data) is unreachable. Plans and tasks may be unavailable.',
      );
    });

    test('dismisses when close button is clicked', async () => {
      const user = userEvent.setup();
      const dismissButton = component.getByRole('button', {
        name: 'Dismiss banner',
      });

      await user.click(dismissButton);

      expect(component.queryByTestId('GlobalServerHealthBanner')).toBeNull();
    });
  });

  describe('when database is unconfigured', () => {
    beforeEach(() => {
      props = {
        health: {
          api: 'ok',
          database: 'unconfigured',
          redis: 'ok',
          websocket: 'ok',
        },
      };
      const Component = () => <GlobalServerHealthBanner {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component = render(<RoutesStub />);
    });

    test('renders the banner with message', () => {
      const banner = component.getByTestId('GlobalServerHealthBanner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(
        'Cortex (AI MCP data) is unreachable. Plans and tasks may be unavailable.',
      );
    });
  });
});
