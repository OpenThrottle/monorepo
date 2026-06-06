import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { MCP_DEVELOPER_AUTH_DOC_HREF } from '~/routing/settings/utils/settings-docs-links';
import { SettingsKeysServiceAccountCredentials } from '../SettingsKeysServiceAccountCredentials';

describe('SettingsKeysServiceAccountCredentials Component', () => {
  test('renders credential guidance and auth docs link', () => {
    const Component = () => <SettingsKeysServiceAccountCredentials />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByText('Service account credentials')).toBeInTheDocument();
    expect(screen.getByText(/One-time secret:/i)).toBeInTheDocument();
    expect(screen.getByText(/Rotation:/i)).toBeInTheDocument();
    expect(
      screen.getByTestId('SettingsKeysIntroduction-docs-link'),
    ).toHaveAttribute('href', MCP_DEVELOPER_AUTH_DOC_HREF);
  });
});
