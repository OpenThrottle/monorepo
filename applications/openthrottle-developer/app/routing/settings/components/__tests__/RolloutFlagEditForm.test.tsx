import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, redirect } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { RolloutFlagKind } from '~/__generated__/graphql';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import { defaultTypedConfigForKind } from '~/routing/settings/utils/rollout-typed-config';
import { RolloutFlagEditForm } from '../RolloutFlagEditForm';
import type { RolloutFlagEditFormProps } from '../RolloutFlagEditForm';

const flag = {
  createdAt: '2026-07-24T00:00:00.000Z',
  description: 'Gates the redesigned dashboard',
  enabled: false,
  fallthrough: { variations: [{ variation: 1, weight: 100 }] },
  id: 'flag-1',
  key: 'new-dashboard',
  kind: RolloutFlagKind.Boolean,
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
          const defaults = defaultTypedConfigForKind(RolloutFlagKind.Boolean);
          submitted.push({
            enabled: formData.get('enabled'),
            fallthroughJson: formData.get('fallthroughJson'),
            id: formData.get('id'),
            intent: formData.get('intent'),
            key: formData.get('key'),
            kind: formData.get('kind'),
            offVariation: formData.get('offVariation'),
            targetRoles: formData.get('targetRoles'),
            variationsJson: formData.get('variationsJson'),
          });
          expect(formData.get('kind')).toBe(defaults.kind);
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

    expect(component.getByLabelText(ROLLOUT_COPY.keyLabel)).toHaveValue(
      'new-dashboard',
    );
    expect(component.getByLabelText(ROLLOUT_COPY.descriptionLabel)).toHaveValue(
      'Gates the redesigned dashboard',
    );
    expect(component.getByLabelText(ROLLOUT_COPY.targetRolesLabel)).toHaveValue(
      'admin, viewer',
    );
    expect(component.getByTestId('RolloutFlagTypedFields')).toBeInTheDocument();
  });

  test('submits an updated flag and redirects', async () => {
    const user = userEvent.setup();
    setup();

    const keyInput = component.getByLabelText(ROLLOUT_COPY.keyLabel);
    await user.clear(keyInput);
    await user.type(keyInput, 'redesigned-dashboard');
    await user.click(
      component.getByRole('button', { name: ROLLOUT_COPY.saveButton }),
    );

    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toMatchObject({
      id: 'flag-1',
      intent: 'updateRolloutFlag',
      key: 'redesigned-dashboard',
      kind: 'boolean',
      targetRoles: 'admin, viewer',
    });
    expect(typeof submitted[0]?.variationsJson).toBe('string');
    expect(typeof submitted[0]?.fallthroughJson).toBe('string');
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
