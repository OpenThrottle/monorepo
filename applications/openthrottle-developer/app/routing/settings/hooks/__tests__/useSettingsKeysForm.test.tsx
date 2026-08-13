import * as React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub, useSubmit } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ServiceAccountCredentialFieldsFragment } from '~/__generated__/graphql';
import type { SettingsKeysCreateCredentialActionData } from '../useSettingsKeysForm';
import { useSettingsKeysForm } from '../useSettingsKeysForm';
import type { UseSettingsKeysFormResult } from '../useSettingsKeysForm';

const mockCredential: ServiceAccountCredentialFieldsFragment = {
  __typename: 'ServiceAccountCredentialObject',
  createdAt: '2026-01-01T00:00:00Z',
  expiresAt: null,
  id: 'credential-1',
  label: 'CI token',
  lastUsedAt: null,
  prefix: 'ot_ci',
  revokedAt: null,
  serviceAccountId: 'account-1',
};

const successActionData: SettingsKeysCreateCredentialActionData = {
  credential: mockCredential,
  intent: 'createCredential',
  token: 'raw-token-value',
};

interface HarnessProps {
  actionData?: SettingsKeysCreateCredentialActionData | null;
  onCreateDialogOpenChange?: (open: boolean) => void;
  onResult: (result: UseSettingsKeysFormResult) => void;
  serviceAccountId?: string | null;
}

let resolveAction: (() => void) | null = null;

function Harness(props: HarnessProps): React.ReactElement {
  const result = useSettingsKeysForm({
    actionData: props.actionData,
    onCreateDialogOpenChange: props.onCreateDialogOpenChange,
    serviceAccountId: props.serviceAccountId,
  });
  props.onResult(result);
  const submit = useSubmit();

  return (
    <button
      onClick={() => submit({ intent: 'createCredential' }, { method: 'post' })}
      type="button"
    >
      submit
    </button>
  );
}

function renderSettingsKeysForm(props: HarnessProps): RenderResult {
  const Stub = createRoutesStub([
    {
      // eslint-disable-next-line react/no-multi-comp -- inline harness wrapper
      Component: () => <Harness {...props} />,
      action: () =>
        new Promise((resolve) => {
          resolveAction = () => resolve(null);
        }),
      path: '/',
    },
  ]);

  return render(<Stub />);
}

describe('useSettingsKeysForm', () => {
  let latest: UseSettingsKeysFormResult;
  const onResult = (result: UseSettingsKeysFormResult): void => {
    latest = result;
  };

  beforeEach(() => {
    resolveAction = null;
  });

  test('canSubmit is false without a serviceAccountId', () => {
    renderSettingsKeysForm({ onResult, serviceAccountId: null });

    expect(latest.canSubmit).toBe(false);
  });

  test('canSubmit is true with a serviceAccountId and no submission in flight', () => {
    renderSettingsKeysForm({ onResult, serviceAccountId: 'account-1' });

    expect(latest.canSubmit).toBe(true);
    expect(latest.isSubmitting).toBe(false);
  });

  test('showSuccess and successPayload reflect a fresh createCredential action result', () => {
    renderSettingsKeysForm({
      actionData: successActionData,
      onResult,
      serviceAccountId: 'account-1',
    });

    expect(latest.successPayload).toEqual(successActionData);
    expect(latest.showSuccess).toBe(true);
  });

  test('successPayload is null when the action data is not a createCredential success', () => {
    renderSettingsKeysForm({
      actionData: null,
      onResult,
      serviceAccountId: 'account-1',
    });

    expect(latest.successPayload).toBeNull();
    expect(latest.showSuccess).toBe(false);
  });

  test('handleOpenChange(false) dismisses the current success payload and resets expiresAt', () => {
    const onCreateDialogOpenChange = vi.fn();
    renderSettingsKeysForm({
      actionData: successActionData,
      onCreateDialogOpenChange,
      onResult,
      serviceAccountId: 'account-1',
    });

    act(() => latest.setExpiresAt(new Date('2030-01-01')));
    expect(latest.expiresAt).toEqual(new Date('2030-01-01'));

    act(() => latest.handleOpenChange(false));

    expect(latest.showSuccess).toBe(false);
    expect(latest.expiresAt).toBeUndefined();
    expect(onCreateDialogOpenChange).toHaveBeenCalledWith(false);
  });

  test('handleDone closes the dialog via handleOpenChange(false)', () => {
    const onCreateDialogOpenChange = vi.fn();
    renderSettingsKeysForm({
      onCreateDialogOpenChange,
      onResult,
      serviceAccountId: 'account-1',
    });

    act(() => latest.handleDone());

    expect(onCreateDialogOpenChange).toHaveBeenCalledWith(false);
  });

  test('handleCopyToken copies the token and reports success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderSettingsKeysForm({
      actionData: successActionData,
      onResult,
      serviceAccountId: 'account-1',
    });

    await act(async () => {
      await latest.handleCopyToken();
    });

    expect(writeText).toHaveBeenCalledWith('raw-token-value');
  });

  test('handleCopyToken is a no-op when there is no success payload', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderSettingsKeysForm({
      actionData: null,
      onResult,
      serviceAccountId: 'account-1',
    });

    await act(async () => {
      await latest.handleCopyToken();
    });

    expect(writeText).not.toHaveBeenCalled();
  });

  test('isSubmitting reflects an in-flight createCredential navigation', async () => {
    const component = renderSettingsKeysForm({
      onResult,
      serviceAccountId: 'account-1',
    });

    await act(async () => {
      component.getByRole('button', { name: 'submit' }).click();
    });

    expect(latest.isSubmitting).toBe(true);

    await act(async () => {
      resolveAction?.();
    });

    await waitFor(() => expect(latest.isSubmitting).toBe(false));
  });
});
