import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { RolloutFlagFormFields } from './RolloutFlagFormFields';
import type { RolloutFlagFormFieldsProps } from './RolloutFlagFormFields';
import { RolloutFlagKind } from '~/__generated__/graphql';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';

const flag: RolloutFlagFormFieldsProps['flag'] = {
  createdAt: '2026-07-24T00:00:00.000Z',
  description: 'Gates the redesigned dashboard',
  enabled: true,
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

describe('RolloutFlagFormFields Component', () => {
  let component: RenderResult;
  let props: RolloutFlagFormFieldsProps;

  beforeEach(() => {
    props = { idPrefix: 'test' };
    component = render(<RolloutFlagFormFields {...props} />);
  });

  test('renders empty inputs when no flag is provided', () => {
    expect(component.getByLabelText(ROLLOUT_COPY.keyLabel)).toHaveValue('');
    expect(component.getByLabelText(ROLLOUT_COPY.descriptionLabel)).toHaveValue(
      '',
    );
    expect(
      component.getByLabelText(ROLLOUT_COPY.enabledLabel),
    ).not.toBeChecked();
  });

  test('seeds the inputs from the provided flag', () => {
    component.unmount();
    component = render(<RolloutFlagFormFields flag={flag} idPrefix="test" />);

    expect(component.getByLabelText(ROLLOUT_COPY.keyLabel)).toHaveValue(
      'new-dashboard',
    );
    expect(component.getByLabelText(ROLLOUT_COPY.descriptionLabel)).toHaveValue(
      'Gates the redesigned dashboard',
    );
    expect(component.getByLabelText(ROLLOUT_COPY.targetRolesLabel)).toHaveValue(
      'admin, viewer',
    );
    expect(component.getByLabelText(ROLLOUT_COPY.enabledLabel)).toBeChecked();
  });

  test('scopes input ids to the given idPrefix', () => {
    expect(component.getByLabelText(ROLLOUT_COPY.keyLabel)).toHaveAttribute(
      'id',
      'test-key',
    );
  });
});
