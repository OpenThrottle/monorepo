import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { LANDING_PROMISE } from '~/routing/home/data/data.landing';
import { LandingPromise } from '../LandingPromise';

describe('LandingPromise Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = render(<LandingPromise />);
  });

  test('renders the kicker, title, and lede from data', () => {
    expect(component.getByTestId('LandingPromise')).toBeInTheDocument();
    expect(component.getByText(LANDING_PROMISE.kicker)).toBeInTheDocument();
    expect(component.getByText(LANDING_PROMISE.title)).toBeInTheDocument();
    expect(component.getByText(LANDING_PROMISE.lede)).toBeInTheDocument();
  });
});
