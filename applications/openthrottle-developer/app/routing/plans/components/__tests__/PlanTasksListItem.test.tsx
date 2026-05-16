import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTasksListItem } from '../PlanTasksListItem';
import type { PlanTasksListItemProps } from '../PlanTasksListItem';

describe('PlanTasksListItem Component', () => {
  let component: RenderResult;
  let props: PlanTasksListItemProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanTasksListItem {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders list item placeholder', () => {
    expect(component.getByTestId('PlanTasksListItem')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'PlanTasksListItem' }),
    ).toBeInTheDocument();
  });
});
