import { describe, expect, test } from 'vitest';
import { screen } from '@testing-library/react';
import {
  buildSupportBundlePayload,
  SettingsLogsPanel,
} from '~/routing/settings/components/SettingsLogsPanel';
import { renderWithMemoryRouter } from '~/testing/route-fixtures';

describe('SettingsLogsPanel', () => {
  test('renders client sink and support bundle sections', () => {
    renderWithMemoryRouter([
      {
        element: <SettingsLogsPanel />,
        path: '/',
      },
    ]);

    expect(screen.getByTestId('GlobalHeading')).toHaveTextContent('Logs');
    expect(
      screen.getByText(/Capture browser console output/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Client console sink/i)).toBeInTheDocument();
    expect(
      screen.getByText('Support bundle', { exact: true }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Workflow & agent logs/i)).toBeInTheDocument();
    expect(screen.getByTestId('logs-buffer-summary')).toHaveTextContent(
      '0/1000',
    );
    expect(
      screen.getByText(/Logs may include URLs or user-visible strings/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy log JSON' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy bundle JSON' }),
    ).toBeInTheDocument();
  });

  test('buildSupportBundlePayload includes kind and workflow placeholder', () => {
    const payload = buildSupportBundlePayload();
    expect(payload.kind).toBe('openthrottle-developer-support-bundle');
    expect(payload.version).toBe(1);
    expect(payload.workflowLogs.apiStatus).toBe('not_available');
    expect(Object.keys(payload.env).length).toBeGreaterThan(0);
  });
});
