import * as React from 'react';
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
      repo: 'openthrottle/monorepo',
      stars: '100',
    };

    const Component = () => <OpenThrottleProductGetStarted {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders intro copy, clone command, and GitHub CTA', () => {
    expect(component.getByText(INTRODUCTIONS[0].text)).toBeInTheDocument();
    expect(
      component.getByRole('button', {
        name: 'git clone https://github.com/openthrottle/monorepo.git',
      }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'View on GitHub' }),
    ).toHaveAttribute('href', 'https://github.com/OpenThrottle');
  });
});
