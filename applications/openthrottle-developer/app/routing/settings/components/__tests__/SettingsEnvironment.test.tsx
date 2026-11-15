import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { renderRoutesStub } from '~/testing/route-fixtures';

import type { SettingsEnvironmentProps } from '../SettingsEnvironment';
import { SettingsEnvironment } from '../SettingsEnvironment';

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
    const component = renderRoutesStub(<SettingsEnvironment {...props} />);

    expect(component.getByText('Sanitized env snapshot')).toBeInTheDocument();
    expect(component.getByText('APP_NAME')).toBeInTheDocument();
    expect(component.getByText('openthrottle-developer')).toBeInTheDocument();
    expect(component.getByText('APP_URL')).toBeInTheDocument();
    expect(component.getByText('http://localhost:6020')).toBeInTheDocument();
  });

  test('copies env snapshot as JSON when Copy JSON is clicked', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const component = renderRoutesStub(<SettingsEnvironment {...props} />);

    await user.click(component.getByRole('button', { name: 'Copy JSON' }));

    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify(props.envSnapshot, null, 2),
    );
  });
});
