import * as React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, useSearchParams } from 'react-router';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { GLOBAL_METRICS_STAT_CARD_DOCS } from '../../config';
import {
  GlobalMetricsInfoModal,
  GlobalMetricsInfoTrigger,
} from '../GlobalMetricsInfoModal';
import type { GlobalMetricsInfoModalProps } from '../GlobalMetricsInfoModal';

const renderHarness = (
  modalProps: GlobalMetricsInfoModalProps = {},
  initialEntries: readonly string[] = ['/'],
): { readonly user: ReturnType<typeof userEvent.setup> } => {
  const Component = (): React.ReactElement => {
    const [searchParams] = useSearchParams();

    return (
      <div>
        <span data-testid="current-search">{searchParams.toString()}</span>
        <GlobalMetricsInfoTrigger />
        <GlobalMetricsInfoModal {...modalProps} />
      </div>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  const user = userEvent.setup();

  render(<RoutesStub initialEntries={[...initialEntries]} />);

  return { user };
};

describe('GlobalMetricsInfoModal Component', () => {
  afterEach(() => {
    cleanup();
  });

  describe('when the URL has no modal param', () => {
    beforeEach(() => {
      renderHarness({}, ['/']);
    });

    test('does not render the dialog content', () => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(
        screen.queryByText('What you are looking at'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the URL has modal=ServerMetricsInfo', () => {
    beforeEach(() => {
      renderHarness({}, ['/?modal=ServerMetricsInfo']);
    });

    test('renders the dialog with the heading and intro copy', () => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(
        within(dialog).getByText('What you are looking at'),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText(/serverMetrics/, { selector: 'code' }),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText('openthrottle-server'),
      ).toBeInTheDocument();
    });

    test('renders each stat card title from GLOBAL_METRICS_STAT_CARD_DOCS', () => {
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Stat cards')).toBeInTheDocument();

      for (const doc of GLOBAL_METRICS_STAT_CARD_DOCS) {
        expect(within(dialog).getByText(doc.title)).toBeInTheDocument();
      }
    });

    test('renders Poll & chart bullets', () => {
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(/Poll & chart/)).toBeInTheDocument();
      expect(within(dialog).getByText('Poll interval')).toBeInTheDocument();
      expect(within(dialog).getByText('Metrics over time')).toBeInTheDocument();
    });
  });

  describe('when definitionsHref is provided', () => {
    test('renders the Settings deep link with the supplied href', () => {
      renderHarness(
        { definitionsHref: '/settings/debug#server-metrics-definitions' },
        ['/?modal=ServerMetricsInfo'],
      );

      const link = screen.getByTestId(
        'GlobalMetricsInfoModal-definitions-link',
      );
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        'href',
        '/settings/debug#server-metrics-definitions',
      );
      expect(link).toHaveTextContent('Open full definitions in Settings');
    });
  });

  describe('when definitionsHref is omitted', () => {
    test('does not render the Settings deep link', () => {
      renderHarness({}, ['/?modal=ServerMetricsInfo']);

      expect(
        screen.queryByTestId('GlobalMetricsInfoModal-definitions-link'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the trigger button is clicked from a closed state', () => {
    test('updates the URL to include modal=ServerMetricsInfo and opens the dialog', async () => {
      const { user } = renderHarness({}, ['/?keep=value']);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('GlobalMetrics-info-trigger'));

      const qs = new URLSearchParams(
        screen.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.get('modal')).toBe('ServerMetricsInfo');
      expect(qs.get('keep')).toBe('value');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('when the open dialog is closed', () => {
    test('via the close button removes the modal param from the URL', async () => {
      const { user } = renderHarness({}, ['/?modal=ServerMetricsInfo&keep=v']);

      const dialog = screen.getByRole('dialog');
      const closeButton = within(dialog).getByRole('button', {
        name: 'Close',
      });

      await user.click(closeButton);

      const qs = new URLSearchParams(
        screen.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.has('modal')).toBe(false);
      expect(qs.get('keep')).toBe('v');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('via the Escape key removes the modal param from the URL', async () => {
      const { user } = renderHarness({}, ['/?modal=ServerMetricsInfo']);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      const qs = new URLSearchParams(
        screen.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.has('modal')).toBe(false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
