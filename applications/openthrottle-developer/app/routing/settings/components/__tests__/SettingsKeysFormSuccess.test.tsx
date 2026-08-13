import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from '@openthrottle/react-router-shadcn';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { SettingsKeysCreateCredentialActionData } from '~/routing/settings/hooks/useSettingsKeysForm';
import { SettingsKeysFormSuccess } from '../SettingsKeysFormSuccess';
import type { SettingsKeysFormSuccessProps } from '../SettingsKeysFormSuccess';

const payload: SettingsKeysCreateCredentialActionData = {
  credential: {
    createdAt: '2026-08-01T00:00:00.000Z',
    expiresAt: null,
    id: 'cred-1',
    label: 'CI runner',
    lastUsedAt: null,
    prefix: 'ot_live_ab12',
    revokedAt: null,
    serviceAccountId: 'sa-1',
  },
  intent: 'createCredential',
  token: 'ot_live_ab12cdef34567890',
};

describe('SettingsKeysFormSuccess Component', () => {
  let component: RenderResult;
  let props: SettingsKeysFormSuccessProps;

  beforeEach(() => {
    props = {
      onCopyToken: vi.fn().mockResolvedValue(undefined),
      onDone: vi.fn(),
      payload,
    };

    component = render(
      <Dialog open={true}>
        <SettingsKeysFormSuccess {...props} />
      </Dialog>,
    );
  });

  test('renders the one-time token, label, and prefix', () => {
    expect(component.getByText('Credential created')).toBeInTheDocument();
    expect(component.getByTestId('SettingsKeysForm-token-input')).toHaveValue(
      'ot_live_ab12cdef34567890',
    );
    expect(component.getByText('CI runner')).toBeInTheDocument();
    expect(component.getByText('Prefix: ot_live_ab12')).toBeInTheDocument();
  });

  test('omits the label line when the credential has no label', () => {
    component.unmount();
    component = render(
      <Dialog open={true}>
        <SettingsKeysFormSuccess
          {...props}
          payload={{
            ...payload,
            credential: { ...payload.credential, label: null },
          }}
        />
      </Dialog>,
    );

    expect(component.queryByText('Label:')).not.toBeInTheDocument();
  });

  test('invokes onCopyToken when Copy is clicked', async () => {
    const user = userEvent.setup();

    await user.click(component.getByTestId('SettingsKeysForm-copy-token'));

    expect(props.onCopyToken).toHaveBeenCalledTimes(1);
  });

  test('invokes onDone when Done is clicked', async () => {
    const user = userEvent.setup();

    await user.click(component.getByTestId('SettingsKeysForm-done-button'));

    expect(props.onDone).toHaveBeenCalledTimes(1);
  });
});
