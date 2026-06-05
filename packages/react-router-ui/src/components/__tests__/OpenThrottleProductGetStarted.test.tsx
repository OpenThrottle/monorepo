import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { INTRODUCTIONS } from '../../data/data.introductions';
import { OpenThrottleProductGetStarted } from '../OpenThrottleProductGetStarted';
import type { OpenThrottleProductGetStartedProps } from '../OpenThrottleProductGetStarted';

describe('OpenThrottleProductGetStarted Component', () => {
  let component: RenderResult;
  let props: OpenThrottleProductGetStartedProps;

  beforeEach(() => {
    props = {
      introduction: INTRODUCTIONS[0].text,
    };

    const Component = () => <OpenThrottleProductGetStarted {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
