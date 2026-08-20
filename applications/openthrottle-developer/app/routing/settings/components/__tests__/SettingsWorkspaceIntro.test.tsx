import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SettingsWorkspaceIntro } from '../SettingsWorkspaceIntro';

describe('SettingsWorkspaceIntro Component', () => {
  test('renders workspace heading and intro copy', () => {
    const Component = () => <SettingsWorkspaceIntro />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(
      screen.getByRole('heading', { name: 'Workspace' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Choose which editors OpenThrottle configures/i),
    ).toBeInTheDocument();
  });
});
