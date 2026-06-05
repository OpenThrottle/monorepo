import * as React from 'react';
import { render } from '@testing-library/react';
import { BotIcon } from 'lucide-react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleProductFeatures } from '../OpenThrottleProductFeatures';
import type { OpenThrottleProductFeaturesProps } from '../OpenThrottleProductFeatures';

describe('OpenThrottleProductFeatures Component', () => {
  let component: RenderResult;
  let props: OpenThrottleProductFeaturesProps;

  beforeEach(() => {
    props = {
      features: [
        {
          description: 'Test description',
          icon: BotIcon,
          title: 'Test title',
        },
      ],
    };

    const Component = () => <OpenThrottleProductFeatures {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
