import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { LANDING_FLOW } from '~/routing/home/data/data.landing';
import { LandingFlow } from '../LandingFlow';

describe('LandingFlow Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = render(<LandingFlow />);
  });

  test('renders every step with leading-zero numbering', () => {
    expect(component.getByTestId('LandingFlow')).toBeInTheDocument();

    LANDING_FLOW.steps.forEach((step, index) => {
      expect(component.getByText(step.title)).toBeInTheDocument();
      expect(component.getByText(step.body)).toBeInTheDocument();
      expect(
        component.getByText(String(index + 1).padStart(2, '0')),
      ).toBeInTheDocument();
    });
  });
});
