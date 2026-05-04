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

    expect(screen.getByText(/Client console sink/i)).toBeInTheDocument();
    expect(screen.getByText(/Support bundle/i)).toBeInTheDocument();
    expect(screen.getByText(/Workflow & agent logs/i)).toBeInTheDocument();
  });

  test('buildSupportBundlePayload includes kind and workflow placeholder', () => {
    const payload = buildSupportBundlePayload();
    expect(payload.kind).toBe('openthrottle-developer-support-bundle');
    expect(payload.version).toBe(1);
    expect(payload.workflowLogs.apiStatus).toBe('not_available');
    expect(Object.keys(payload.env).length).toBeGreaterThan(0);
  });
});
