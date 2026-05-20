import * as React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SettingsEnvironment } from '../SettingsEnvironment';
import type { SettingsEnvironmentProps } from '../SettingsEnvironment';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('SettingsEnvironment Component', () => {
  let props: SettingsEnvironmentProps;

  beforeEach(() => {
    props = {
      envSnapshot: {
        APP_NAME: 'openthrottle-developer',
        APP_URL: 'http://localhost:6020',
      },
    };
  });

  test('renders env keys in the snapshot table', () => {
    renderRoutesStub(<SettingsEnvironment {...props} />);

    expect(screen.getByText('Sanitized env snapshot')).toBeInTheDocument();
    expect(screen.getByText('APP_NAME')).toBeInTheDocument();
    expect(screen.getByText('openthrottle-developer')).toBeInTheDocument();
    expect(screen.getByText('APP_URL')).toBeInTheDocument();
    expect(screen.getByText('http://localhost:6020')).toBeInTheDocument();
  });

  test('copies env snapshot as JSON when Copy JSON is clicked', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    renderRoutesStub(<SettingsEnvironment {...props} />);

    await user.click(screen.getByRole('button', { name: 'Copy JSON' }));

    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify(props.envSnapshot, null, 2),
    );
  });
});
