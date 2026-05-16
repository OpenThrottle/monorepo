import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanNotFound } from '../PlanNotFound';
import type { PlanNotFoundProps } from '../PlanNotFound';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('PlanNotFound Component', () => {
  let component: RenderResult;
  let props: PlanNotFoundProps;

  beforeEach(() => {
    props = {};

    component = renderRoutesStub(<PlanNotFound {...props} />);
  });

  test('renders empty state copy for missing plan', () => {
    expect(
      component.getByRole('heading', { name: 'Plan not found' }),
    ).toBeInTheDocument();
    expect(
      component.getByText('The plan you are looking for does not exist.'),
    ).toBeInTheDocument();
  });
});
