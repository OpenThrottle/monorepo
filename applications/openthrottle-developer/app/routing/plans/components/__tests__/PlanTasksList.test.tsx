import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTasksList } from '../PlanTasksList';
import type { PlanTasksListProps } from '../PlanTasksList';

describe('PlanTasksList Component', () => {
  let component: RenderResult;
  let props: PlanTasksListProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanTasksList {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
