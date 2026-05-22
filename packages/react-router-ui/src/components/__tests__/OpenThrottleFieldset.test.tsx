import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleFieldset } from '../OpenThrottleFieldset';
import type { OpenThrottleFieldsetProps } from '../OpenThrottleFieldset';

describe('OpenThrottleFieldset Component', () => {
  let component: RenderResult;
  let props: OpenThrottleFieldsetProps;

  beforeEach(() => {
    props = {
      id: 'fieldset',
      legend: 'Fieldset',
    };

    const Component = () => <OpenThrottleFieldset {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
