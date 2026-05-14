import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTabRequirements } from '../PlanTabRequirements';
import type { PlanTabRequirementsProps } from '../PlanTabRequirements';

describe('PlanTabRequirements Component', () => {
  let component: RenderResult;
  let props: PlanTabRequirementsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanTabRequirements {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
