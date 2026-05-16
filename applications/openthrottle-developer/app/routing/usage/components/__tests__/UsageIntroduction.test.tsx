import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { UsageIntroduction } from '../UsageIntroduction';
import type { UsageIntroductionProps } from '../UsageIntroduction';

describe('UsageIntroduction Component', () => {
  let component: RenderResult;
  let props: UsageIntroductionProps;

  beforeEach(() => {
    props = {
      rangeDays: 30,
    };

    const Component = () => <UsageIntroduction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
