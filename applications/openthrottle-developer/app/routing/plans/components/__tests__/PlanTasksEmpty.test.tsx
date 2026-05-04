import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTasksEmpty } from '../PlanTasksEmpty';
import type { PlanTasksEmptyProps } from '../PlanTasksEmpty';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('PlanTasksEmpty Component', () => {
  let component: RenderResult;
  let props: PlanTasksEmptyProps;

  beforeEach(() => {
    props = {};

    component = renderRoutesStub(<PlanTasksEmpty {...props} />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
