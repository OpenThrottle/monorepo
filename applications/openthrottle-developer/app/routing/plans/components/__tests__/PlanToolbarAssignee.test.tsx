import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanToolbarAssignee } from '../PlanToolbarAssignee';
import type { PlanToolbarAssigneeProps } from '../PlanToolbarAssignee';

describe('PlanToolbarAssignee Component', () => {
  let component: RenderResult;
  let props: PlanToolbarAssigneeProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanToolbarAssignee {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
