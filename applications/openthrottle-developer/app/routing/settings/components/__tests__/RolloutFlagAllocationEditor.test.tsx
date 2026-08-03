import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import { RolloutFlagAllocationEditor } from '../RolloutFlagAllocationEditor';
import type { RolloutFlagAllocationEditorProps } from '../RolloutFlagAllocationEditor';

describe('RolloutFlagAllocationEditor Component', () => {
  let component: RenderResult;
  let props: RolloutFlagAllocationEditorProps;

  const setup = (): void => {
    const Component = () => <RolloutFlagAllocationEditor {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      idPrefix: 'edit',
      offVariation: 0,
      onFallthroughChange: () => undefined,
      onOffVariationChange: () => undefined,
      variationLabels: ['control', 'treatment'],
      weights: [
        { variation: 0, weight: 90 },
        { variation: 1, weight: 10 },
      ],
    };
    setup();
  });

  test('shows live sum status from copy constants when valid', () => {
    expect(
      component.getByText(ROLLOUT_COPY.fallthroughSumStatusPrefix, {
        exact: false,
      }).textContent,
    ).toContain('100');
    expect(
      component.getByLabelText(ROLLOUT_COPY.offVariationLabel),
    ).toBeInTheDocument();
    expect(component.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('surfaces invalid sum with role=alert from copy', () => {
    component.unmount();
    props = {
      ...props,
      weights: [
        { variation: 0, weight: 40 },
        { variation: 1, weight: 40 },
      ],
    };
    setup();
    const alert = component.getByRole('alert');
    expect(alert.textContent).toContain(
      ROLLOUT_COPY.fallthroughSumStatusPrefix,
    );
    expect(alert.textContent).toContain('80');
  });
});
