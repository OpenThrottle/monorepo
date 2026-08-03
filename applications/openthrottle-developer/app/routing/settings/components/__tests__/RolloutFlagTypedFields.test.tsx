import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import { RolloutFlagTypedFields } from '../RolloutFlagTypedFields';
import type { RolloutFlagTypedFieldsProps } from '../RolloutFlagTypedFields';

describe('RolloutFlagTypedFields Component', () => {
  let component: RenderResult;
  let props: RolloutFlagTypedFieldsProps;

  beforeEach(() => {
    props = { idPrefix: 'create-rollout-flag' };

    const Component = () => <RolloutFlagTypedFields {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders kind selector and default boolean variations', () => {
    expect(component.getByTestId('RolloutFlagTypedFields')).toBeInTheDocument();
    expect(
      component.getByLabelText(ROLLOUT_COPY.kindLabel),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('RolloutFlagVariationsEditor'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('RolloutFlagAllocationEditor'),
    ).toBeInTheDocument();
    expect(
      component.getByText(ROLLOUT_COPY.fallthroughSumStatusPrefix, {
        exact: false,
      }).textContent,
    ).toContain('100');
  });
});
