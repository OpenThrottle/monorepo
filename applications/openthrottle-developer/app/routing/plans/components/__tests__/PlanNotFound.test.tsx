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

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
