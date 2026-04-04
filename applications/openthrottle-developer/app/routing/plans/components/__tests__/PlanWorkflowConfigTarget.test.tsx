import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanWorkflowConfigTarget } from '../PlanWorkflowConfigTarget';
import type { PlanWorkflowConfigTargetProps } from '../PlanWorkflowConfigTarget';
import { getDefaultWorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';

describe('PlanWorkflowConfigTarget Component', () => {
  let component: RenderResult;
  let props: PlanWorkflowConfigTargetProps;

  beforeEach(() => {
    props = {
      input: getDefaultWorkflowRalphRunOptionsInput(),
      setInput: () => {},
    };

    const Component = () => <PlanWorkflowConfigTarget {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
