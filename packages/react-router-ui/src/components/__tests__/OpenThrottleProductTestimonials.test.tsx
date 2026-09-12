import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { OpenThrottleProductTestimonialsProps } from '../OpenThrottleProductTestimonials';
import { OpenThrottleProductTestimonials } from '../OpenThrottleProductTestimonials';

describe('OpenThrottleProductTestimonials Component', () => {
  let component: RenderResult;
  let props: OpenThrottleProductTestimonialsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleProductTestimonials {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the testimonial quote', () => {
    expect(
      component.getByText(/OpenThrottle is a game-changer/),
    ).toBeInTheDocument();
  });

  test('should render the attribution', () => {
    expect(component.getByText('~ Matthew Scholta')).toBeInTheDocument();
    expect(component.getByText('Creator of OpenThrottle')).toBeInTheDocument();
  });
});
