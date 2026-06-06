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
          link: '/test',
          title: 'Test title',
        },
      ],
    };

    const Component = () => <OpenThrottleProductFeatures {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders feature title, description, and view code link', () => {
    expect(
      component.getByTestId('OpenThrottleProductFeatures'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'Test title' }),
    ).toBeInTheDocument();
    expect(component.getByText('Test description')).toBeInTheDocument();
    expect(component.getByRole('link', { name: /view code/i })).toHaveAttribute(
      'href',
      '/test',
    );
  });
});
