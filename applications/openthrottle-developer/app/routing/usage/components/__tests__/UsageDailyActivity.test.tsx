import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { UsageDailyActivity } from '../UsageDailyActivity';
import type { UsageDailyActivityProps } from '../UsageDailyActivity';

describe('UsageDailyActivity Component', () => {
  let component: RenderResult;
  let props: UsageDailyActivityProps;

  beforeEach(() => {
    props = {};

    const Component = () => <UsageDailyActivity {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
