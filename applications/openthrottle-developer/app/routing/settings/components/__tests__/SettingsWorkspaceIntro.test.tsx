import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { SettingsWorkspaceIntro } from '../SettingsWorkspaceIntro';

describe('SettingsWorkspaceIntro Component', () => {
  test('renders workspace heading and intro copy', () => {
    const Component = () => {
      return <SettingsWorkspaceIntro />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByRole('heading', { name: 'Workspace' }),
    ).toBeInTheDocument();
    expect(
      component.getByText(/Choose which editors OpenThrottle configures/i),
    ).toBeInTheDocument();
  });
});
