import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { OpenThrottleTableProps } from '../OpenThrottleTable';
import { OpenThrottleTable } from '../OpenThrottleTable';

describe('OpenThrottleTable Component', () => {
  let component: RenderResult;
  let props: OpenThrottleTableProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders table region and heading', () => {
    expect(component.getByTestId('OpenThrottleTable')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'OpenThrottle Table' }),
    ).toBeInTheDocument();
  });
});
