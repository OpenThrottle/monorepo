import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { RolloutFlagKind } from '~/__generated__/graphql';
import type { RolloutFlagFieldsFragment } from '~/__generated__/graphql';
import { RolloutFlagDetail } from '../RolloutFlagDetail';
import type { RolloutFlagDetailProps } from '../RolloutFlagDetail';

const mockFlag: RolloutFlagFieldsFragment = {
  __typename: 'RolloutFlagObject',
  createdAt: '2026-07-24T00:00:00.000Z',
  description: 'Gates the redesigned dashboard',
  enabled: true,
  fallthrough: { variations: [{ variation: 1, weight: 100 }] },
  id: 'flag-1',
  key: 'new-dashboard',
  kind: RolloutFlagKind.Boolean,
  offVariation: 0,
  targetRoles: [],
  updatedAt: '2026-07-24T00:00:00.000Z',
  variations: [
    { description: null, name: null, valueJson: 'false' },
    { description: null, name: null, valueJson: 'true' },
  ],
};

describe('RolloutFlagDetail Component', () => {
  let component: RenderResult;
  let props: RolloutFlagDetailProps;

  beforeEach(() => {
    props = {
      editTo: '/settings/rollout/flag-1/edit',
      flag: mockFlag,
    };

    const Component = () => <RolloutFlagDetail {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('renders the flag key and description', () => {
    expect(component.getByTestId('RolloutFlagDetail')).toBeInTheDocument();
    expect(component.getByText('new-dashboard')).toBeInTheDocument();
    expect(
      component.getByText('Gates the redesigned dashboard'),
    ).toBeInTheDocument();
  });

  test('renders the Edit link pointing to editTo', () => {
    expect(component.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/settings/rollout/flag-1/edit',
    );
  });

  test('renders the Enabled badge when enabled is true', () => {
    expect(component.getAllByText('Enabled').length).toBeGreaterThan(1);
  });

  test('renders untargeted roles as Everyone', () => {
    expect(component.getByText('Everyone (untargeted)')).toBeInTheDocument();
  });
});
