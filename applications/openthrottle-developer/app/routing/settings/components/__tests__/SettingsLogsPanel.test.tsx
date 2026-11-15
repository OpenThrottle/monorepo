import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SettingsLogsPanel } from '~/routing/settings/components/SettingsLogsPanel';
import { buildSupportBundlePayload } from '~/routing/settings/utils/settings.support';
import { renderWithMemoryRouter } from '~/testing/route-fixtures';

describe('SettingsLogsPanel', () => {
  test('renders client sink and support bundle sections', () => {
    const component = renderWithMemoryRouter([
      {
        element: <SettingsLogsPanel />,
        path: '/',
      },
    ]);

    const headings = component.getAllByTestId('GlobalHeading');
    expect(
      headings.some((heading) => heading.textContent?.includes('Logs')),
    ).toBe(true);
    expect(
      component.getByText(/Capture browser console output/i),
    ).toBeInTheDocument();
    expect(component.getByText(/Client console sink/i)).toBeInTheDocument();
    expect(
      component.getByText('Support bundle', { exact: true }),
    ).toBeInTheDocument();
    expect(component.getByText(/Workflow & Server Logs/i)).toBeInTheDocument();
    expect(component.getByTestId('logs-buffer-summary')).toHaveTextContent(
      '0/1000',
    );
    expect(
      component.getByText(/Logs may include URLs or user-visible strings/i),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Copy log JSON' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Copy bundle JSON' }),
    ).toBeInTheDocument();
  });

  test('buildSupportBundlePayload includes kind and workflow placeholder', () => {
    const payload = buildSupportBundlePayload();
    expect(payload.kind).toBe('support');
    expect(payload.version).toBe(1);
    expect(payload.workflowLogs.apiStatus).toBe('not_available');
    expect(Object.keys(payload.env).length).toBeGreaterThan(0);
  });
});
