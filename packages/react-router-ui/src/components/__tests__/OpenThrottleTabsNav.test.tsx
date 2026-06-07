import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleTabsNav } from '../OpenThrottleTabsNav';
import type { OpenThrottleTabsNavProps } from '../OpenThrottleTabsNav';

describe('OpenThrottleTabsNav Component', () => {
  let component: RenderResult;
  let props: OpenThrottleTabsNavProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleTabsNav {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders tabs nav region and heading', () => {
    expect(component.getByTestId('OpenThrottleTabsNav')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'OpenThrottleTabsNav' }),
    ).toBeInTheDocument();
  });
});
