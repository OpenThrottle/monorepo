import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import {
  buildSupportBundlePayload,
  SettingsLogsPanel,
} from '~/routing/settings/components/SettingsLogsPanel';

describe('SettingsLogsPanel', () => {
  test('renders client sink and support bundle sections', () => {
    const router = createMemoryRouter(
      [
        {
          element: <SettingsLogsPanel />,
          path: '/',
        },
      ],
      { initialEntries: ['/'] },
    );

    render(<RouterProvider router={router} />);

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
