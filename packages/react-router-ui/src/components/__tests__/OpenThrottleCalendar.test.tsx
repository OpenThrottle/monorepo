import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleCalendar } from '../OpenThrottleCalendar';
import type { OpenThrottleCalendarProps } from '../OpenThrottleCalendar';

describe('OpenThrottleCalendar Component', () => {
  let component: RenderResult;
  let props: OpenThrottleCalendarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleCalendar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
