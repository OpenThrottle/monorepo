import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { UsageCaptureHealthRowFragment } from '~/__generated__/graphql';

import type { UsageCaptureHealthProps } from '../UsageCaptureHealth';
import { UsageCaptureHealth } from '../UsageCaptureHealth';

const NOW_ISO = '2026-10-29T12:00:00.000Z';
const HOUR_MS = 60 * 60 * 1000;

/** ISO instant `hours` before {@link NOW_ISO}. */
const hoursAgo = (hours: number): string =>
  new Date(new Date(NOW_ISO).getTime() - hours * HOUR_MS).toISOString();

const buildRow = (
  overrides: Partial<UsageCaptureHealthRowFragment>,
): UsageCaptureHealthRowFragment => ({
  lastCapturedAt: hoursAgo(1),
  source: 'claude-code',
  stream: 'skill_events',
  ...overrides,
});

const renderComponent = (
  props: Partial<UsageCaptureHealthProps> = {},
): RenderResult =>
  render(<UsageCaptureHealth nowIso={NOW_ISO} rows={[]} {...props} />);

describe('UsageCaptureHealth Component', () => {
  describe('when every source captured within 24 hours', () => {
    test('lists one table row per stream and source with no warning', () => {
      const component = renderComponent({
        rows: [
          buildRow({ source: 'claude-code' }),
          buildRow({ source: 'cursor', stream: 'skill_outcomes' }),
          buildRow({
            lastCapturedAt: hoursAgo(23),
            source: 'claude',
            stream: 'token_usage',
          }),
        ],
      });

      expect(component.getByTestId('UsageCaptureHealth')).toBeInTheDocument();
      expect(component.getByRole('table')).toBeInTheDocument();
      expect(component.getAllByTestId('UsageCaptureHealthRow')).toHaveLength(3);
      expect(component.queryByRole('alert')).not.toBeInTheDocument();
    });

    test('renders each last-captured time as a machine-readable time element', () => {
      const lastCapturedAt = hoursAgo(3);
      const component = renderComponent({
        rows: [buildRow({ lastCapturedAt })],
      });

      const row = component.getByTestId('UsageCaptureHealthRow');
      const time = row.querySelector('time');

      expect(time).toHaveAttribute('datetime', lastCapturedAt);
      expect(time).toHaveTextContent('3h ago');
    });
  });

  describe('when a source has not captured for more than 24 hours', () => {
    test('raises one alert per stale source and marks only its row stale', () => {
      const component = renderComponent({
        rows: [
          buildRow({ source: 'claude-code' }),
          buildRow({
            lastCapturedAt: hoursAgo(25),
            source: 'cursor',
            stream: 'skill_events',
          }),
          buildRow({
            lastCapturedAt: hoursAgo(24 * 35),
            source: 'claude',
            stream: 'token_usage',
          }),
        ],
      });

      const alerts = component.getAllByRole('alert');
      const rows = component.getAllByTestId('UsageCaptureHealthRow');

      expect(alerts).toHaveLength(2);
      expect(rows.filter((row) => row.dataset.stale === 'true')).toHaveLength(
        2,
      );
      expect(rows.filter((row) => row.dataset.stale === 'false')).toHaveLength(
        1,
      );
    });

    test('lists stale rows before fresh ones', () => {
      const component = renderComponent({
        rows: [
          buildRow({ source: 'a-fresh' }),
          buildRow({ lastCapturedAt: hoursAgo(48), source: 'z-stale' }),
        ],
      });

      const rows = component.getAllByTestId('UsageCaptureHealthRow');

      expect(rows[0]?.dataset.stale).toBe('true');
      expect(rows[1]?.dataset.stale).toBe('false');
    });
  });

  describe('when a source captured exactly 24 hours ago', () => {
    test('is not yet stale', () => {
      const component = renderComponent({
        rows: [buildRow({ lastCapturedAt: hoursAgo(24) })],
      });

      expect(component.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('when there are no rows at all', () => {
    test('shows a warning alert instead of a table', () => {
      const component = renderComponent({ rows: [] });

      expect(component.getByRole('alert')).toBeInTheDocument();
      expect(component.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('when a stream name is unknown to the UI', () => {
    test('still renders the row using the raw stream name', () => {
      const component = renderComponent({
        rows: [buildRow({ stream: 'future_stream' })],
      });

      expect(component.getByText('future_stream')).toBeInTheDocument();
    });
  });
});
