import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, redirect } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { RolloutFlagEditForm } from '../RolloutFlagEditForm';
import type { RolloutFlagEditFormProps } from '../RolloutFlagEditForm';

const flag = {
  createdAt: '2026-07-24T00:00:00.000Z',
  description: 'Gates the redesigned dashboard',
  enabled: false,
  fallthrough: { variations: [{ variation: 1, weight: 100 }] },
  id: 'flag-1',
  key: 'new-dashboard',
  kind: 'boolean' as const,
  offVariation: 0,
  targetRoles: ['admin', 'viewer'],
  updatedAt: '2026-07-24T00:00:00.000Z',
  variations: [
    { description: null, name: null, valueJson: 'false' },
    { description: null, name: null, valueJson: 'true' },
  ],
};

describe('RolloutFlagEditForm Component', () => {
  let component: RenderResult;
  let props: RolloutFlagEditFormProps;
  let submitted: Record<string, FormDataEntryValue | null>[];

  const setup = (): void => {
    const Component = () => <RolloutFlagEditForm {...props} />;
    const RoutesStub = createRoutesStub([
      {
        Component,
        action: async ({ request }: { request: Request }) => {
          const formData = await request.formData();
          submitted.push({
            enabled: formData.get('enabled'),
            id: formData.get('id'),
            intent: formData.get('intent'),
            key: formData.get('key'),
            targetRoles: formData.get('targetRoles'),
          });
          return redirect('/detail');
        },
        path: '/edit',
      },
      { path: '/detail' },
    ]);
    component = render(<RoutesStub initialEntries={['/edit']} />);
  };

  beforeEach(() => {
    submitted = [];
    props = { cancelTo: '/detail', flag };
  });

  test('seeds the form with the flag key, description, and target roles', () => {
    setup();

    expect(component.getByLabelText('Key')).toHaveValue('new-dashboard');
    expect(component.getByLabelText('Description')).toHaveValue(
      'Gates the redesigned dashboard',
    );
    expect(component.getByLabelText('Target roles')).toHaveValue(
      'admin, viewer',
    );
  });

  test('submits an updated flag and redirects', async () => {
    const user = userEvent.setup();
    setup();

    const keyInput = component.getByLabelText('Key');
    await user.clear(keyInput);
    await user.type(keyInput, 'redesigned-dashboard');
    await user.click(component.getByRole('button', { name: /Save changes/ }));

    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toMatchObject({
      id: 'flag-1',
      intent: 'updateRolloutFlag',
      key: 'redesigned-dashboard',
      targetRoles: 'admin, viewer',
    });
    await waitFor(() =>
      expect(
        component.queryByTestId('RolloutFlagEditForm'),
      ).not.toBeInTheDocument(),
    );
  });

  test('surfaces an action error inline', () => {
    props.actionError = 'A flag key is required.';
    setup();

    expect(component.getByText('A flag key is required.')).toBeInTheDocument();
  });
});
