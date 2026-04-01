import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanFilters } from '../PlanFilters';
import type { PlanFiltersProps } from '../PlanFilters';

describe('PlanFilters Component', () => {
  let component: RenderResult;
  let props: PlanFiltersProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanFilters {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render placeholder shell', () => {
    expect(component.getByTestId('PlanFilters')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: /planfilters/i }),
    ).toBeInTheDocument();
  });
});
