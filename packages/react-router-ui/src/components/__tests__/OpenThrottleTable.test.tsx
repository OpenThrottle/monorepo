import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleTable } from '../OpenThrottleTable';
import type { OpenThrottleTableProps } from '../OpenThrottleTable';

describe('OpenThrottleTable Component', () => {
  let component: RenderResult;
  let props: OpenThrottleTableProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
